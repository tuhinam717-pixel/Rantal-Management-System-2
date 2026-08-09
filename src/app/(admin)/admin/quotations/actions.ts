"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireRole } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { billableUnits, lineDeposit, lineRent, round2 } from "@/lib/rental/pricing";
import { getActivePricelistId } from "@/server/services/catalog";
import { formatCurrency } from "@/lib/utils";
import { confirmQuotation } from "@/server/services/quotations";

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

  const template = await prisma.quotationTemplate.findFirst({
    where: { isDefault: true },
    select: { id: true, validityDays: true },
  });

  // The template's own validity wins over the org default when it sets one.
  const validDays =
    template?.validityDays ?? settings?.quotationValidDays ?? 7;
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + validDays);

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

  const quotation = await prisma.quotation.update({
    where: { id },
    data: { status: "SENT" },
    select: { id: true, number: true, customerId: true, total: true },
  });

  // "Send" used to only flip a status, so the customer never learned a
  // quotation existed. It now reaches them: visible in their portal, and
  // announced through the same notification bell as their rentals.
  await prisma.notification.create({
    data: {
      userId: quotation.customerId,
      kind: "QUOTATION_SENT",
      title: `Quotation ${quotation.number} is ready for you`,
      body: `Review the items and total of ${formatCurrency(Number(quotation.total))}, then accept to confirm your rental.`,
      dedupeKey: `QUOTATION_SENT:${quotation.id}`,
    },
  });

  revalidatePath("/admin/quotations");
  revalidatePath("/quotations");
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

  // The same transaction the customer's Accept runs — see confirmQuotation.
  const result = await confirmQuotation(id);
  if (!result.ok) return;

  revalidatePath("/admin/quotations");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/dashboard");
  revalidatePath("/quotations");
  redirect("/admin/orders");
}

// ------------------------------------------------------------- templates

const templateSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Name is required"),
  header: z.string().optional(),
  footer: z.string().optional(),
  terms: z.string().optional(),
  // From the mockup: "Quotation Validity ___ Days" and "Payment Terms ___ %".
  paymentTermsPercent: z.coerce
    .number()
    .int()
    .min(1, "Payment terms must be at least 1%")
    .max(100, "Payment terms cannot exceed 100%"),
  validityDays: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() !== "" ? Number(v) : null))
    .refine((v) => v === null || (Number.isInteger(v) && v >= 1), {
      message: "Validity must be a whole number of days",
    }),
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
