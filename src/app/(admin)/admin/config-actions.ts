"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { requireRole } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

export type FormState = { error?: string; ok?: boolean };

function refreshConfig() {
  revalidatePath("/admin/pricelists");
  revalidatePath("/admin/rental-periods");
  revalidatePath("/admin/settings");
  revalidatePath("/admin/late-fees");
  revalidatePath("/products");
}

// ------------------------------------------------------------- pricelists

const pricelistSchema = z.object({
  name: z.string().min(2, "Name is required"),
  validFrom: z.string().optional(),
  validTo: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});

export async function createPricelistAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireRole("ADMIN");

  const parsed = pricelistSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const { name, validFrom, validTo, isActive } = parsed.data;

  if (validFrom && validTo && new Date(validTo) <= new Date(validFrom)) {
    return { error: "The end date must be after the start date." };
  }

  await prisma.pricelist.create({
    data: {
      name: name.trim(),
      isDefault: false,
      isActive: isActive ?? true,
      validFrom: validFrom ? new Date(validFrom) : null,
      validTo: validTo ? new Date(validTo) : null,
    },
  });

  refreshConfig();
  return { ok: true };
}

/**
 * Exactly one pricelist may be the default, so this swaps in a transaction.
 *
 * Refuses to promote an empty pricelist: the default is what every product
 * falls back to, so making a rate-less list the default would price the whole
 * catalogue at nothing and break checkout and quotations instantly.
 */
export async function setDefaultPricelistAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireRole("ADMIN");
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing pricelist." };

  const rates = await prisma.pricelistItem.count({ where: { pricelistId: id } });
  if (rates === 0) {
    return {
      error:
        "This pricelist has no rates yet. Add at least one rate before making it the default, or the catalogue would have no prices.",
    };
  }

  await prisma.$transaction([
    prisma.pricelist.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    }),
    prisma.pricelist.update({
      where: { id },
      data: { isDefault: true, isActive: true },
    }),
  ]);

  refreshConfig();
  return { ok: true };
}

export async function togglePricelistAction(formData: FormData) {
  await requireRole("ADMIN");
  const id = String(formData.get("id") ?? "");
  const next = formData.get("isActive") === "true";
  if (!id) return;

  await prisma.pricelist.update({ where: { id }, data: { isActive: next } });
  refreshConfig();
}

export async function deletePricelistAction(formData: FormData) {
  await requireRole("ADMIN");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const list = await prisma.pricelist.findUnique({ where: { id } });
  // Deleting the default would leave the catalogue with no prices at all.
  if (!list || list.isDefault) return;

  await prisma.pricelist.delete({ where: { id } });
  refreshConfig();
}

/** Saves the whole product x period grid for one pricelist in one submit. */
export async function savePriceGridAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireRole("ADMIN");

  const pricelistId = String(formData.get("pricelistId") ?? "");
  if (!pricelistId) return { error: "Missing pricelist." };

  const updates: { productId: string; rentalPeriodId: string; price: number }[] = [];
  const clears: { productId: string; rentalPeriodId: string }[] = [];

  for (const [key, raw] of formData.entries()) {
    // Field name: cell_<productId>_<rentalPeriodId>
    if (!key.startsWith("cell_")) continue;
    const [, productId, rentalPeriodId] = key.split("_");
    if (!productId || !rentalPeriodId) continue;

    const value = String(raw).trim();
    if (value === "") {
      clears.push({ productId, rentalPeriodId });
      continue;
    }

    const price = Number(value);
    if (!Number.isFinite(price) || price < 0) {
      return { error: "Prices must be zero or more." };
    }
    updates.push({ productId, rentalPeriodId, price });
  }

  await prisma.$transaction(async (tx) => {
    for (const u of updates) {
      await tx.pricelistItem.upsert({
        where: {
          pricelistId_productId_rentalPeriodId: {
            pricelistId,
            productId: u.productId,
            rentalPeriodId: u.rentalPeriodId,
          },
        },
        update: { price: u.price },
        create: { pricelistId, ...u },
      });
    }
    for (const c of clears) {
      await tx.pricelistItem.deleteMany({ where: { pricelistId, ...c } });
    }
  });

  refreshConfig();
  return { ok: true };
}

// ---------------------------------------------------------- rental periods

const periodSchema = z.object({
  name: z.string().min(2, "Name is required"),
  unit: z.enum(["HOUR", "DAY", "WEEK", "MONTH"]),
  duration: z.coerce.number().int().min(1, "Duration must be at least 1"),
});

export async function createRentalPeriodAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireRole("ADMIN");

  const parsed = periodSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  try {
    await prisma.rentalPeriod.create({ data: parsed.data });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { error: "That unit and duration combination already exists." };
    }
    return { error: "Could not create the rental period." };
  }

  refreshConfig();
  return { ok: true };
}

export async function toggleRentalPeriodAction(formData: FormData) {
  await requireRole("ADMIN");
  const id = String(formData.get("id") ?? "");
  const next = formData.get("isActive") === "true";
  if (!id) return;

  await prisma.rentalPeriod.update({ where: { id }, data: { isActive: next } });
  refreshConfig();
}

export async function deleteRentalPeriodAction(formData: FormData) {
  await requireRole("ADMIN");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const inUse = await prisma.rentalOrderLine.count({ where: { rentalPeriodId: id } });
  if (inUse > 0) {
    // Referenced by order history; deactivate rather than break the records.
    await prisma.rentalPeriod.update({ where: { id }, data: { isActive: false } });
  } else {
    await prisma.pricelistItem.deleteMany({ where: { rentalPeriodId: id } });
    await prisma.rentalPeriod.delete({ where: { id } });
  }

  refreshConfig();
}

// --------------------------------------------------------------- settings

const settingsSchema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  currency: z.string().min(3).max(3),
  defaultDepositType: z.enum(["FIXED", "PERCENTAGE"]),
  defaultDepositValue: z.coerce.number().min(0),
  defaultGraceHours: z.coerce.number().int().min(0),
  quotationValidDays: z.coerce.number().int().min(1),
});

export async function saveSettingsAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireRole("ADMIN");

  const parsed = settingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  await prisma.orgSettings.upsert({
    where: { id: "default" },
    update: parsed.data,
    create: { id: "default", ...parsed.data },
  });

  refreshConfig();
  return { ok: true };
}

// ----------------------------------------------------------- late-fee rule

const ruleSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Name is required"),
  unit: z.enum(["HOUR", "DAY", "WEEK", "MONTH"]),
  amountPerUnit: z.coerce.number().min(0),
  graceHours: z.coerce.number().int().min(0),
  maxAmount: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});

export async function saveLateFeeRuleAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireRole("ADMIN");

  const parsed = ruleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const { id, maxAmount, isActive, ...rest } = parsed.data;
  const cap = maxAmount && maxAmount.trim() !== "" ? Number(maxAmount) : null;

  if (cap !== null && (!Number.isFinite(cap) || cap < 0)) {
    return { error: "The maximum must be a positive number, or left blank." };
  }

  const data = { ...rest, maxAmount: cap, isActive: isActive ?? false };

  if (id) {
    await prisma.lateFeeRule.update({ where: { id }, data });
  } else {
    await prisma.lateFeeRule.create({ data });
  }

  refreshConfig();
  return { ok: true };
}

export async function deleteLateFeeRuleAction(formData: FormData) {
  await requireRole("ADMIN");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const used = await prisma.lateFee.count({ where: { ruleId: id } });
  if (used > 0) {
    await prisma.lateFeeRule.update({ where: { id }, data: { isActive: false } });
  } else {
    await prisma.lateFeeRule.delete({ where: { id } });
  }

  refreshConfig();
}
