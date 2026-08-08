"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireRole } from "@/lib/auth/current-user";
import { LONG_TRANSACTION, prisma } from "@/lib/prisma";
import { billableUnits, lineDeposit, lineRent, round2 } from "@/lib/rental/pricing";
import { getActivePricelistId } from "@/server/services/catalog";

export type FormState = { error?: string; ok?: boolean };

const quotationSchema = z.object({
  customerId: z.string().min(1, "Choose a customer"),
  productId: z.string().min(1, "Choose a product"),
  rentalPeriodId: z.string().min(1, "Choose a rental period"),
  quantity: z.coerce.number().int().min(1),
  rentalStart: z.coerce.date(),
  rentalEnd: z.coerce.date(),
  notes: z.string().optional(),
});

/**
 * Walk-in flow from the brief: the admin builds a quotation for a customer
 * standing in the shop, then confirms it into a rental order.
 */
export async function createQuotationAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireRole("ADMIN");

  const parsed = quotationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const data = parsed.data;
  if (data.rentalEnd <= data.rentalStart) {
    return { error: "The return date must be after the start date." };
  }

  const pricelistId = await getActivePricelistId();
  const [product, period, settings] = await Promise.all([
    prisma.product.findUnique({ where: { id: data.productId } }),
    prisma.rentalPeriod.findUnique({ where: { id: data.rentalPeriodId } }),
    prisma.orgSettings.findUnique({ where: { id: "default" } }),
  ]);

  if (!product || !period) return { error: "Product or rental period not found." };

  const priceRow = await prisma.pricelistItem.findUnique({
    where: {
      pricelistId_productId_rentalPeriodId: {
        pricelistId,
        productId: data.productId,
        rentalPeriodId: data.rentalPeriodId,
      },
    },
  });

  if (!priceRow) {
    return { error: "That product has no rate for the selected rental period." };
  }

  const unitPrice = Number(priceRow.price);
  const units = billableUnits(
    data.rentalStart,
    data.rentalEnd,
    period.unit,
    period.duration
  );
  const rent = lineRent(unitPrice, units, data.quantity);
  const deposit = lineDeposit(
    product.depositType,
    Number(product.depositValue),
    data.quantity,
    rent
  );

  const count = await prisma.quotation.count();
  const validDays = settings?.quotationValidDays ?? 7;
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + validDays);

  const template = await prisma.quotationTemplate.findFirst({
    where: { isDefault: true },
    select: { id: true },
  });

  await prisma.quotation.create({
    data: {
      number: `QT-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`,
      customerId: data.customerId,
      templateId: template?.id,
      status: "DRAFT",
      subtotal: rent,
      depositTotal: deposit,
      total: round2(rent + deposit),
      validUntil,
      notes: data.notes,
      lines: {
        create: {
          productId: data.productId,
          rentalPeriodId: data.rentalPeriodId,
          quantity: data.quantity,
          unitPrice,
          rentalStart: data.rentalStart,
          rentalEnd: data.rentalEnd,
          lineTotal: rent,
        },
      },
    },
  });

  revalidatePath("/admin/quotations");
  return { ok: true };
}

export async function sendQuotationAction(formData: FormData) {
  await requireRole("ADMIN");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.quotation.update({ where: { id }, data: { status: "SENT" } });
  revalidatePath("/admin/quotations");
}

export async function cancelQuotationAction(formData: FormData) {
  await requireRole("ADMIN");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.quotation.update({ where: { id }, data: { status: "CANCELLED" } });
  revalidatePath("/admin/quotations");
}

export async function deleteQuotationAction(formData: FormData) {
  await requireRole("ADMIN");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: { order: true },
  });
  // A confirmed quotation is the paper trail for a live order; keep it.
  if (!quotation || quotation.order) return;

  await prisma.quotation.delete({ where: { id } });
  revalidatePath("/admin/quotations");
}

/**
 * Confirms a quotation into a rental order: creates the order and lines, the
 * held deposit with its opening ledger entry, the rent and deposit payments,
 * the invoice, and the pickup/return schedule. Mirrors portal checkout.
 */
export async function confirmQuotationAction(formData: FormData) {
  await requireRole("ADMIN");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: { lines: { include: { rentalPeriod: true } }, order: true },
  });

  if (!quotation || quotation.order || quotation.lines.length === 0) return;

  const rentalStart = new Date(
    Math.min(...quotation.lines.map((l) => l.rentalStart.getTime()))
  );
  const rentalEnd = new Date(
    Math.max(...quotation.lines.map((l) => l.rentalEnd.getTime()))
  );

  const rent = Number(quotation.subtotal);
  const deposit = Number(quotation.depositTotal);
  const now = new Date();

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

  await prisma.$transaction(async (tx) => {
    const order = await tx.rentalOrder.create({
      data: {
        number: `RO-${now.getFullYear()}-${String(orderCount + 1).padStart(4, "0")}`,
        customerId: quotation.customerId,
        quotationId: quotation.id,
        status: "CONFIRMED",
        // Walk-in customers collect in store.
        fulfilment: "STORE_PICKUP",
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
        orderId: order.id,
        // Same rule as portal checkout: keep the product's basis when the
        // quotation is uniform, otherwise record the concrete summed amount.
        type: depositBasis.type,
        value: depositBasis.value,
        amount: deposit,
        status: "HELD",
        collectedAt: now,
        transactions: {
          create: {
            type: "COLLECTION",
            amount: deposit,
            note: `Collected in store against quotation ${quotation.number}`,
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
  }, LONG_TRANSACTION);

  revalidatePath("/admin/quotations");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/dashboard");
  redirect("/admin/orders");
}

// ------------------------------------------------------------- templates

const templateSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Name is required"),
  header: z.string().optional(),
  footer: z.string().optional(),
  terms: z.string().optional(),
  isDefault: z.coerce.boolean().optional(),
});

export async function saveTemplateAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireRole("ADMIN");

  const parsed = templateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const { id, isDefault, ...rest } = parsed.data;
  const data = { ...rest, isDefault: isDefault ?? false };

  await prisma.$transaction(async (tx) => {
    if (data.isDefault) {
      await tx.quotationTemplate.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }
    if (id) {
      await tx.quotationTemplate.update({ where: { id }, data });
    } else {
      await tx.quotationTemplate.create({ data });
    }
  });

  revalidatePath("/admin/quotations/templates");
  return { ok: true };
}

export async function deleteTemplateAction(formData: FormData) {
  await requireRole("ADMIN");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.quotation.updateMany({
    where: { templateId: id },
    data: { templateId: null },
  });
  await prisma.quotationTemplate.delete({ where: { id } });
  revalidatePath("/admin/quotations/templates");
}
