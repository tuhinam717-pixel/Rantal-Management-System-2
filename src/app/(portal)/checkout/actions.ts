"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/current-user";
import { checkout } from "@/server/services/orders";

const checkoutSchema = z
  .object({
    fulfilment: z.enum(["DELIVERY", "STORE_PICKUP"]),
    shippingAddressId: z.string().optional(),
    cardName: z.string().min(2, "Enter the name on the card"),
    cardNumber: z
      .string()
      .transform((v) => v.replace(/\s+/g, ""))
      .pipe(z.string().regex(/^\d{12,19}$/, "Enter a valid card number")),
    expiry: z.string().regex(/^\d{2}\/\d{2}$/, "Use MM/YY"),
    cvv: z.string().regex(/^\d{3,4}$/, "Enter the CVV"),
    notes: z.string().optional(),
  })
  .refine(
    (d) => d.fulfilment === "STORE_PICKUP" || Boolean(d.shippingAddressId),
    { message: "Choose a delivery address", path: ["shippingAddressId"] }
  );

export type CheckoutState = { error?: string };

export async function checkoutAction(
  _prev: CheckoutState,
  formData: FormData
): Promise<CheckoutState> {
  const user = await requireUser();

  const parsed = checkoutSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details." };
  }

  const { fulfilment, shippingAddressId, cardNumber, notes } = parsed.data;

  let orderNumber: string;
  try {
    const order = await checkout(user.id, {
      fulfilment,
      shippingAddressId,
      // Card details are never persisted — only the brand and last four would
      // be, and that's all the order needs to show.
      paymentMethod: `Card •••• ${cardNumber.slice(-4)}`,
      notes,
    });
    orderNumber = order.number;
  } catch (error) {
    console.error("[checkout]", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not place your order. Please try again.",
    };
  }

  revalidatePath("/orders");
  revalidatePath("/cart");
  redirect(`/checkout/success?order=${orderNumber}`);
}
