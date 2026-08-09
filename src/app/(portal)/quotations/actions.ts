"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { confirmQuotation } from "@/server/services/quotations";

export type FormState = { error?: string; ok?: boolean };

/**
 * The customer accepts a quotation the admin sent them.
 *
 * Runs the exact transaction the admin's Confirm runs — order, deposit,
 * payments, invoice, pickup, return and stock reservation — with ownership
 * checked inside confirmQuotation rather than trusted from the form.
 */
export async function acceptQuotationAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser();

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing quotation." };

  const result = await confirmQuotation(id, { expectCustomerId: user.id });
  if (!result.ok) return { error: result.error };

  revalidatePath("/quotations");
  revalidatePath("/orders");
  revalidatePath("/dashboard");
  revalidatePath("/admin/quotations");
  redirect(`/orders/${result.orderId}`);
}

export async function declineQuotationAction(formData: FormData) {
  const user = await requireUser();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  // updateMany scoped by customerId and status, so another customer's id
  // matches nothing and an already-confirmed quotation cannot be cancelled.
  await prisma.quotation.updateMany({
    where: { id, customerId: user.id, status: "SENT" },
    data: { status: "CANCELLED" },
  });

  revalidatePath("/quotations");
  revalidatePath("/admin/quotations");
}
