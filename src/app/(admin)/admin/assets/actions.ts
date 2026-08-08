"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

export type FormState = { error?: string; ok?: boolean };

const trackerSchema = z.object({
  id: z.string().optional(),
  deviceId: z
    .string()
    .trim()
    .min(3, "Device ID must be at least 3 characters")
    .max(40),
  label: z.string().trim().max(60).or(z.literal("")).optional(),
  productId: z.string().min(1, "Pick the product this tag is fixed to"),
  status: z.enum(["IDLE", "OUT_ON_RENT", "IN_TRANSIT", "MISSING"]),
});

export async function saveTrackerAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireRole("ADMIN");

  const parsed = trackerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the details." };
  }

  const { id, deviceId, label, productId, status } = parsed.data;

  const clash = await prisma.assetTracker.findFirst({
    where: { deviceId, ...(id ? { NOT: { id } } : {}) },
    select: { id: true },
  });
  if (clash) return { error: `Device ${deviceId} is already paired.` };

  const data = { deviceId, label: label || null, productId, status };

  if (id) {
    await prisma.assetTracker.update({ where: { id }, data });
  } else {
    await prisma.assetTracker.create({ data });
  }

  revalidatePath("/admin/assets");
  return { ok: true };
}

export async function deleteTrackerAction(formData: FormData) {
  await requireRole("ADMIN");

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  // Pings cascade with the tracker.
  await prisma.assetTracker.delete({ where: { id } });
  revalidatePath("/admin/assets");
}
