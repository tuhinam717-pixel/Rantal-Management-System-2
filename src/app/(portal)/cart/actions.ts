"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/current-user";
import {
  addToCart,
  removeCartItem,
  updateCartItemQuantity,
} from "@/server/services/cart";

const addSchema = z.object({
  productId: z.string().min(1),
  rentalPeriodId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(999),
  rentalStart: z.coerce.date(),
  rentalEnd: z.coerce.date(),
});

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function addToCartAction(
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = addSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: "Please choose a rental period and dates." };
  }

  const { rentalStart, rentalEnd } = parsed.data;
  if (rentalEnd <= rentalStart) {
    return { ok: false, error: "The return date must be after the start date." };
  }

  await addToCart(user.id, parsed.data);
  revalidatePath("/cart");

  return { ok: true };
}

export async function updateQuantityAction(formData: FormData) {
  const user = await requireUser();
  const itemId = String(formData.get("itemId") ?? "");
  const quantity = Number(formData.get("quantity") ?? 0);

  if (itemId) {
    await updateCartItemQuantity(user.id, itemId, quantity);
    revalidatePath("/cart");
  }
}

export async function removeItemAction(formData: FormData) {
  const user = await requireUser();
  const itemId = String(formData.get("itemId") ?? "");

  if (itemId) {
    await removeCartItem(user.id, itemId);
    revalidatePath("/cart");
  }
}
