import "server-only";

import type { Prisma } from "@prisma/client";

import { LONG_TRANSACTION, prisma } from "@/lib/prisma";
import { round2 } from "@/lib/rental/pricing";

/**
 * Turn a quotation into a confirmed rental order.
 *
 * Shared deliberately: the admin confirms one at the counter, and the customer
 * accepts the same quotation from the portal. Both have to produce an
 * identical order, deposit, payments and invoice, so there is one
 * implementation rather than two that drift.
 *
 * `expectCustomerId` is how the portal proves ownership — passing it makes the
 * lookup refuse a quotation belonging to someone else.
 */
export async function confirmQuotation(
  quotationId: string,
  options?: { expectCustomerId?: string; fulfilment?: "STORE_PICKUP" | "DELIVERY" }
): Promise<{ ok: true; orderId: string } | { ok: false; error: string }> {
  const quotation = await prisma.quotation.findUnique({
    where: { id: quotationId },
    include: { lines: { include: { rentalPeriod: true } }, order: true },
  });

  if (!quotation) return { ok: false, error: "That quotation no longer exists." };

  if (
    options?.expectCustomerId &&
    quotation.customerId !== options.expectCustomerId
  ) {
    return { ok: false, error: "That quotation is not yours." };
  }

  // Already turned into an order — accepting twice must not create a second.
  if (quotation.order) {
    return { ok: false, error: "This quotation has already been confirmed." };
  }

  if (quotation.status === "CANCELLED") {
    return { ok: false, error: "This quotation was cancelled." };
  }

  if (quotation.lines.length === 0) {
    return { ok: false, error: "This quotation has no items." };
  }

  const now = new Date();

  if (quotation.validUntil && quotation.validUntil < now) {
    return { ok: false, error: "This quotation has expired." };
  }

  const rentalStart = new Date(
    Math.min(...quotation.lines.map((l) => l.rentalStart.getTime()))
  );
  const rentalEnd = new Date(
    Math.max(...quotation.lines.map((l) => l.rentalEnd.getTime()))
  );

  const rent = Number(quotation.subtotal);
  const deposit = Number(quotation.depositTotal);

  const [orderCount, invoiceCount, products] = await Promise.all([
    prisma.rentalOrder.count(),
    prisma.invoice.count(),
    prisma.product.findMany({
      where: { id: { in: quotation.lines.map((l) => l.productId) } },
      select: { depositType: true, depositValue: true },
    }),
  ]);

  const uniform =
    products.length > 0 &&
    products.every((p) => p.depositType === products[0].depositType)
      ? products[0]
      : null;

  const depositBasis = uniform
    ? { type: uniform.depositType, value: Number(uniform.depositValue) }
    : { type: "FIXED" as const, value: deposit };

  const orderId = await prisma.$transaction(async (tx) => {
    const order = await tx.rentalOrder.create({
      data: {
        number: `RO-${now.getFullYear()}-${String(orderCount + 1).padStart(4, "0")}`,
        customerId: quotation.customerId,
        quotationId: quotation.id,
        status: "CONFIRMED",
        fulfilment: options?.fulfilment ?? "STORE_PICKUP",
        rentalStart,
        rentalEnd,
        subtotal: rent,
        depositTotal: deposit,
        total: round2(rent + deposit),
        notes: quotation.notes,
        lines: {
          create: quotation.lines.map((line) => ({
            productId: line.productId,
            rentalPeriodId: line.rentalPeriodId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            depositAmount: deposit,
            lineTotal: line.lineTotal,
          })),
        },
      },
    });

    await tx.securityDeposit.create({
      data: {
        // Same rule as portal checkout: keep the product's basis when the
        // quotation is uniform, otherwise record the concrete summed amount.
        orderId: order.id,
        type: depositBasis.type,
        value: depositBasis.value,
        amount: deposit,
        status: "HELD",
        collectedAt: now,
        transactions: {
          create: {
            type: "COLLECTION",
            amount: deposit,
            note: `Collected against quotation ${quotation.number}`,
          },
        },
      },
    });

    await tx.payment.createMany({
      data: [
        { orderId: order.id, purpose: "RENTAL", status: "PAID", amount: rent, method: "Cash", paidAt: now },
        { orderId: order.id, purpose: "DEPOSIT", status: "PAID", amount: deposit, method: "Cash", paidAt: now },
      ],
    });

    await tx.invoice.create({
      data: {
        number: `INV-${now.getFullYear()}-${String(invoiceCount + 1).padStart(4, "0")}`,
        orderId: order.id,
        kind: "RENTAL",
        amount: round2(rent + deposit),
      },
    });

    await tx.pickup.create({ data: { orderId: order.id, scheduledFor: rentalStart } });
    await tx.return.create({ data: { orderId: order.id, scheduledFor: rentalEnd } });

    for (const line of quotation.lines) {
      await tx.product.update({
        where: { id: line.productId },
        data: { reservedStock: { increment: line.quantity } },
      });
    }

    await tx.quotation.update({
      where: { id: quotation.id },
      data: { status: "CONFIRMED" },
    });

    return order.id;
  }, LONG_TRANSACTION);

  return { ok: true, orderId };
}

/** Quotations a customer may see: their own, once the admin has sent them. */
export async function listQuotationsForCustomer(
  userId: string,
  options?: { skip?: number; take?: number }
) {
  const where: Prisma.QuotationWhereInput = {
    customerId: userId,
    // A DRAFT is still being worked on at the counter; it is not theirs to see.
    status: { in: ["SENT", "CONFIRMED", "CANCELLED"] },
  };

  const [items, total] = await Promise.all([
    prisma.quotation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: options?.skip,
      take: options?.take,
      include: {
        lines: { include: { product: true, rentalPeriod: true } },
        order: { select: { id: true, number: true } },
        template: { select: { header: true, footer: true, terms: true } },
      },
    }),
    prisma.quotation.count({ where }),
  ]);

  return { items, total };
}

export async function getQuotationForCustomer(userId: string, id: string) {
  return prisma.quotation.findFirst({
    // Scoped by customerId so an id from another account returns nothing.
    where: { id, customerId: userId, status: { in: ["SENT", "CONFIRMED", "CANCELLED"] } },
    include: {
      lines: { include: { product: true, rentalPeriod: true } },
      order: { select: { id: true, number: true } },
      template: { select: { header: true, footer: true, terms: true } },
    },
  });
}

/** Awaiting the customer's decision — drives the sidebar badge. */
export async function countPendingQuotations(userId: string) {
  return prisma.quotation.count({
    where: { customerId: userId, status: "SENT" },
  });
}
