"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/current-user";
import {
  confirmPickup,
  markOverdueRentals,
  processReturn,
} from "@/server/services/rentals";

function refreshOps() {
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/pickups");
  revalidatePath("/admin/returns");
  revalidatePath("/admin/deposits");
  revalidatePath("/admin/late-fees");
}

export async function confirmPickupAction(formData: FormData) {
  await requireRole("ADMIN");
  const orderId = String(formData.get("orderId") ?? "");
  if (!orderId) return;

  await confirmPickup(orderId);
  refreshOps();
}

export async function processReturnAction(formData: FormData) {
  await requireRole("ADMIN");

  const orderId = String(formData.get("orderId") ?? "");
  if (!orderId) return;

  const productId = String(formData.get("productId") ?? "");
  const condition = String(formData.get("condition") ?? "GOOD");
  const damageCharge = Number(formData.get("damageCharge") ?? 0);
  const damageNote = String(formData.get("damageNote") ?? "");
  const missingAccessories = String(formData.get("missingAccessories") ?? "");

  await processReturn(orderId, {
    inspections: productId
      ? [
          {
            productId,
            condition: condition as "GOOD" | "DAMAGED" | "MISSING_ACCESSORIES" | "UNUSABLE",
            damageNote: damageNote || undefined,
            missingAccessories: missingAccessories || undefined,
            repairRequired: condition === "DAMAGED" || condition === "UNUSABLE",
            damageCharge: Number.isFinite(damageCharge) ? damageCharge : 0,
          },
        ]
      : [],
  });

  refreshOps();
}

export async function detectOverdueAction() {
  await requireRole("ADMIN");
  await markOverdueRentals();
  refreshOps();
}
