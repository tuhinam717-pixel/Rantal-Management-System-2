"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

export type FormState = { error?: string; ok?: boolean };

const optionalText = (max: number) =>
  z.string().trim().max(max).or(z.literal("")).optional();

const vendorSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Vendor name is required").max(120),
  contactPerson: optionalText(80),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address")
    .or(z.literal(""))
    .optional(),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s()]{7,20}$/, "Enter a valid phone number")
    .or(z.literal(""))
    .optional(),
  gstin: optionalText(20),
  addressLine: optionalText(160),
  city: optionalText(60),
  state: optionalText(60),
  postalCode: optionalText(12),
  country: optionalText(60),
  paymentTermsDays: z.coerce
    .number()
    .int()
    .min(0, "Payment terms cannot be negative")
    .max(365, "365 days is the maximum"),
  notes: optionalText(500),
  isActive: z.coerce.boolean().optional(),
});

export async function saveVendorAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireRole("ADMIN");

  const parsed = vendorSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the details." };
  }

  const { id, isActive, country, ...rest } = parsed.data;

  // Blank optional fields are stored as null, not "", so "no email on file"
  // is one state rather than two.
  const data = {
    ...Object.fromEntries(
      Object.entries(rest).map(([key, value]) => [
        key,
        typeof value === "string" && value.trim() === "" ? null : value,
      ])
    ),
    name: rest.name,
    country: country?.trim() || "India",
    isActive: isActive ?? true,
  } as Parameters<typeof prisma.vendor.create>[0]["data"];

  if (id) {
    await prisma.vendor.update({ where: { id }, data });
  } else {
    await prisma.vendor.create({ data });
  }

  revalidatePath("/admin/vendors");
  revalidatePath("/admin/products");
  return { ok: true };
}

export async function setVendorActiveAction(formData: FormData) {
  await requireRole("ADMIN");

  const id = String(formData.get("id") ?? "");
  const next = formData.get("isActive") === "true";
  if (!id) return;

  await prisma.vendor.update({ where: { id }, data: { isActive: next } });
  revalidatePath("/admin/vendors");
}

export async function deleteVendorAction(formData: FormData) {
  await requireRole("ADMIN");

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  // Products and repair jobs keep their history; the link is simply cleared,
  // which is why both foreign keys are ON DELETE SET NULL.
  await prisma.vendor.delete({ where: { id } });
  revalidatePath("/admin/vendors");
  revalidatePath("/admin/products");
}
