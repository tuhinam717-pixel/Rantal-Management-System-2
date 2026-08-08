import "server-only";

import type { FulfilmentMethod } from "@prisma/client";

import { LONG_TRANSACTION, prisma } from "@/lib/prisma";
import { round2 } from "@/lib/rental/pricing";
import { getCart } from "@/server/services/cart";

/**
 * Sequential, human-readable document numbers (RO-2026-0001).
 *
 * Counting rows is fine at this scale; a production system would use a
 * dedicated sequence to stay safe under concurrent checkouts.
 */
async function nextNumber(prefix: "RO" | "INV", year: number) {
  const count =
    prefix === "RO"
      ? await prisma.rentalOrder.count()
      : await prisma.invoice.count();
  return `${prefix}-${year}-${String(count + 1).padStart(4, "0")}`;
}

export interface CheckoutInput {
  fulfilment: FulfilmentMethod;
  shippingAddressId?: string;
  paymentMethod: string;
  notes?: string;
}

/**
 * Turns the cart into a confirmed rental order.
 *
 * Everything happens in one transaction: order + lines, the security deposit
 * with its opening ledger entry, a payment row for the rent and one for the
 * deposit, the rental invoice, reserved stock, and an emptied cart. A failure
 * anywhere leaves the customer's cart untouched.
 */
export async function checkout(userId: string, input: CheckoutInput) {
  const cart = await getCart(userId);

  if (cart.items.length === 0) {
    throw new Error("Your cart is empty.");
  }

  // The rental window spans the earliest start and latest end across lines.
  const starts = cart.items.map((i) => new Date(i.rentalStart).getTime());
  const ends = cart.items.map((i) => new Date(i.rentalEnd).getTime());
  const rentalStart = new Date(Math.min(...starts));
  const rentalEnd = new Date(Math.max(...ends));

  const year = rentalStart.getFullYear();
  const orderNumber = await nextNumber("RO", year);
  const invoiceNumber = await nextNumber("INV", year);

  /**
   * Record how the deposit was actually derived, not the org default.
   *
   * When every line uses the same rule we keep it (so a 30%-of-rent order still
   * reads as PERCENTAGE with 30). A mixed cart has no single rule, so it is
   * recorded as the concrete summed amount instead of a misleading percentage.
   */
  const products = await prisma.product.findMany({
    where: { id: { in: cart.items.map((i) => i.product.id) } },
    select: { depositType: true, depositValue: true },
  });

  const uniformType =
    products.length > 0 &&
    products.every((p) => p.depositType === products[0].depositType)
      ? products[0]
      : null;

  const depositBasis = uniformType
    ? { type: uniformType.depositType, value: Number(uniformType.depositValue) }
    : { type: "FIXED" as const, value: cart.depositTotal };

  return prisma.$transaction(async (tx) => {
    const order = await tx.rentalOrder.create({
      data: {
        number: orderNumber,
        customerId: userId,
        status: "CONFIRMED",
        fulfilment: input.fulfilment,
        shippingAddressId:
          input.fulfilment === "DELIVERY" ? input.shippingAddressId : null,
        rentalStart,
        rentalEnd,
        subtotal: cart.rentTotal,
        depositTotal: cart.depositTotal,
        total: round2(cart.rentTotal + cart.depositTotal),
        notes: input.notes,
        lines: {
          create: cart.items.map((item) => ({
            productId: item.product.id,
            rentalPeriodId: item.rentalPeriod.id,
            quantity: item.quantity,
            unitPrice: item.rentalPeriod.price,
            depositAmount: item.depositAmount,
            lineTotal: item.lineTotal,
          })),
        },
      },
    });

    // Deposit is collected at confirmation and held until the return clears.
    await tx.securityDeposit.create({
      data: {
        orderId: order.id,
        type: depositBasis.type,
        value: depositBasis.value,
        amount: cart.depositTotal,
        status: "HELD",
        collectedAt: new Date(),
        transactions: {
          create: {
            type: "COLLECTION",
            amount: cart.depositTotal,
            note: "Collected at order confirmation",
          },
        },
      },
    });

    await tx.payment.createMany({
      data: [
        {
          orderId: order.id,
          purpose: "RENTAL",
          status: "PAID",
          amount: cart.rentTotal,
          method: input.paymentMethod,
          paidAt: new Date(),
        },
        {
          orderId: order.id,
          purpose: "DEPOSIT",
          status: "PAID",
          amount: cart.depositTotal,
          method: input.paymentMethod,
          paidAt: new Date(),
        },
      ],
    });

    await tx.invoice.create({
      data: {
        number: invoiceNumber,
        orderId: order.id,
        kind: "RENTAL",
        amount: round2(cart.rentTotal + cart.depositTotal),
      },
    });

    // Schedule the two ends of the rental so they appear on the ops dashboard.
    await tx.pickup.create({
      data: { orderId: order.id, scheduledFor: rentalStart },
    });
    await tx.return.create({
      data: { orderId: order.id, scheduledFor: rentalEnd },
    });

    // Hold stock so the catalogue stops promising units that are spoken for.
    for (const item of cart.items) {
      await tx.product.update({
        where: { id: item.product.id },
        data: { reservedStock: { increment: item.quantity } },
      });
    }

    await tx.cartItem.deleteMany({
      where: { cart: { userId } },
    });

    return order;
  }, LONG_TRANSACTION);
}

export async function listOrdersForCustomer(
  userId: string,
  options?: { skip?: number; take?: number }
) {
  const [items, total] = await Promise.all([
    prisma.rentalOrder.findMany({
      where: { customerId: userId },
      orderBy: { createdAt: "desc" },
      skip: options?.skip,
      take: options?.take,
      include: {
        lines: { include: { product: true } },
        deposit: true,
      },
    }),
    prisma.rentalOrder.count({ where: { customerId: userId } }),
  ]);

  return { items, total };
}

export async function getOrderForCustomer(userId: string, orderId: string) {
  return prisma.rentalOrder.findFirst({
    // Scoped by customerId so an id from another account returns nothing.
    where: { id: orderId, customerId: userId },
    include: {
      lines: { include: { product: true, rentalPeriod: true } },
      deposit: { include: { transactions: { orderBy: { createdAt: "asc" } } } },
      payments: true,
      lateFees: true,
      invoices: true,
      shippingAddress: true,
      customer: { select: { name: true, email: true, phone: true } },
    },
  });
}
