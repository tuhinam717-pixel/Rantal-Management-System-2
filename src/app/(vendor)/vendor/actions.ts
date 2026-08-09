"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireVendor } from "@/lib/auth/current-user";
import { imageUrlSchema } from "@/lib/image";
import { prisma } from "@/lib/prisma";

export type FormState = { error?: string; ok?: boolean };

const profileSchema = z.object({
  contactPerson: z.string().trim().max(80).or(z.literal("")).optional(),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s()]{7,20}$/, "Enter a valid phone number")
    .or(z.literal(""))
    .optional(),
  gstin: z.string().trim().max(20).or(z.literal("")).optional(),
  addressLine: z.string().trim().max(160).or(z.literal("")).optional(),
  city: z.string().trim().max(60).or(z.literal("")).optional(),
  state: z.string().trim().max(60).or(z.literal("")).optional(),
  postalCode: z.string().trim().max(12).or(z.literal("")).optional(),
});

/**
 * A supplier maintains their own contact details.
 *
 * Deliberately narrow: name, payment terms and active status stay with the
 * rental business, since those are commercial terms rather than contact info.
 */
export async function updateVendorProfileAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const { vendor } = await requireVendor();

  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the details." };
  }

  const blankToNull = (value?: string) => (value?.trim() ? value.trim() : null);

  await prisma.vendor.update({
    where: { id: vendor.id },
    data: {
      contactPerson: blankToNull(parsed.data.contactPerson),
      phone: blankToNull(parsed.data.phone),
      gstin: blankToNull(parsed.data.gstin),
      addressLine: blankToNull(parsed.data.addressLine),
      city: blankToNull(parsed.data.city),
      state: blankToNull(parsed.data.state),
      postalCode: blankToNull(parsed.data.postalCode),
    },
  });

  revalidatePath("/vendor/profile");
  revalidatePath("/vendor/dashboard");
  return { ok: true };
}

const repairUpdateSchema = z.object({
  jobId: z.string().min(1),
  notes: z.string().trim().max(500).or(z.literal("")).optional(),
  actualCost: z.coerce.number().min(0).optional(),
  start: z.string().optional(),
  ready: z.string().optional(),
});

/**
 * Progress a job the vendor is actually doing: mark it started, record a
 * quote, leave notes.
 *
 * Closing a repair is not offered here on purpose — completing one returns
 * units to availability and is the rental team's decision, not the supplier's.
 * updateMany is scoped by vendorId so a job id from another supplier matches
 * nothing.
 */
export async function updateRepairProgressAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const { vendor } = await requireVendor();

  const parsed = repairUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the details." };
  }

  const { jobId, notes, actualCost, start, ready } = parsed.data;

  const job = await prisma.repairJob.findFirst({
    where: { id: jobId, vendorId: vendor.id },
    select: { id: true, status: true },
  });
  if (!job) return { error: "That job is not assigned to you." };

  if (job.status === "COMPLETED" || job.status === "WRITTEN_OFF") {
    return { error: "That job is already closed." };
  }

  const markReady = ready === "true";

  await prisma.repairJob.updateMany({
    where: { id: jobId, vendorId: vendor.id },
    data: {
      ...(notes !== undefined ? { notes: notes.trim() || null } : {}),
      ...(actualCost !== undefined ? { actualCost } : {}),
      // Declaring the work done implies it was started.
      ...(markReady || (start === "true" && job.status === "PENDING")
        ? { status: "IN_PROGRESS", startedAt: new Date() }
        : {}),
      vendorReady: markReady,
      vendorReadyAt: markReady ? new Date() : null,
    },
  });

  revalidatePath("/vendor/repairs");
  revalidatePath("/vendor/dashboard");
  revalidatePath("/admin/repairs");
  return { ok: true };
}

// ------------------------------------------------------------------ products

const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Product name is required").max(120),
  sku: z.string().trim().min(2, "SKU is required").max(40),
  description: z.string().trim().max(2000).or(z.literal("")).optional(),
  imageUrl: imageUrlSchema,
  totalStock: z.coerce.number().int().min(0, "Stock cannot be negative"),
});

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/**
 * A supplier maintains the products they supply: what it is, how it looks, and
 * how many units they have provided.
 *
 * Price, listing and deposit stay with the rental business — those are
 * commercial decisions, not the supplier's. A new product is therefore created
 * unlisted: it cannot be rented until the business prices and lists it.
 */
export async function saveVendorProductAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const { vendor } = await requireVendor();

  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the details." };
  }

  const { id, name, sku, description, imageUrl, totalStock } = parsed.data;
  const upperSku = sku.toUpperCase();

  const skuClash = await prisma.product.findFirst({
    where: { sku: upperSku, ...(id ? { NOT: { id } } : {}) },
    select: { id: true },
  });
  if (skuClash) return { error: `SKU ${upperSku} is already in use.` };

  const shared = {
    name,
    sku: upperSku,
    description: description?.trim() || null,
    imageUrl: imageUrl || null,
  };

  if (id) {
    // Scoped by vendorId, so another supplier's product id matches nothing.
    const existing = await prisma.product.findFirst({
      where: { id, vendorId: vendor.id },
      select: { reservedStock: true, underRepairStock: true },
    });
    if (!existing) return { error: "That product is not yours to edit." };

    const committed = existing.reservedStock + existing.underRepairStock;
    if (totalStock < committed) {
      return {
        error: `${committed} unit(s) are out on rent or in repair, so stock cannot go below that.`,
      };
    }

    await prisma.product.updateMany({
      where: { id, vendorId: vendor.id },
      data: { ...shared, totalStock },
    });
  } else {
    await prisma.product.create({
      data: {
        ...shared,
        slug: `${slugify(name)}-${Date.now().toString(36)}`,
        totalStock,
        vendorId: vendor.id,
        // Unlisted until the rental business prices it.
        isRentable: false,
      },
    });
  }

  revalidatePath("/vendor/products");
  revalidatePath("/vendor/dashboard");
  revalidatePath("/admin/products");
  return { ok: true };
}
