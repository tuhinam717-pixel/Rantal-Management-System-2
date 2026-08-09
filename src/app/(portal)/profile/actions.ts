"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/current-user";
import { imageUrlSchema } from "@/lib/image";
import { prisma } from "@/lib/prisma";

export type FormState = {
  error?: string;
  ok?: boolean;
  /** Set by saveAddressAction so checkout can select the address it just created. */
  addressId?: string;
};

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(80),
  phone: z
    .string()
    .regex(/^[0-9+\-\s()]{7,20}$/, "Enter a valid phone number")
    .or(z.literal(""))
    .optional(),
  imageUrl: imageUrlSchema,
});

export async function updateProfileAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser();

  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: parsed.data.name.trim(),
      phone: parsed.data.phone?.trim() || null,
      imageUrl: parsed.data.imageUrl?.trim() || null,
    },
  });

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  return { ok: true };
}

// --------------------------------------------------------------- addresses

const addressSchema = z.object({
  id: z.string().optional(),
  label: z.string().optional(),
  line1: z.string().min(3, "Address line 1 is required"),
  line2: z.string().optional(),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  postalCode: z.string().regex(/^[0-9A-Za-z\s-]{4,10}$/, "Enter a valid postcode"),
  country: z.string().optional(),
  isDefault: z.coerce.boolean().optional(),
});

export async function saveAddressAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser();

  const parsed = addressSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the address." };
  }

  const { id, isDefault, country, ...rest } = parsed.data;
  const existingCount = await prisma.address.count({ where: { userId: user.id } });
  // First address a customer saves is their default, whatever they ticked.
  const makeDefault = isDefault || existingCount === 0;

  const savedId = await prisma.$transaction(async (tx) => {
    if (makeDefault) {
      await tx.address.updateMany({
        where: { userId: user.id },
        data: { isDefault: false },
      });
    }

    const data = {
      ...rest,
      label: rest.label?.trim() || null,
      line2: rest.line2?.trim() || null,
      country: country?.trim() || "India",
      isDefault: makeDefault,
      userId: user.id,
    };

    if (id) {
      // updateMany scopes by userId so another user's id can't be edited.
      await tx.address.updateMany({
        where: { id, userId: user.id },
        data: { ...data, userId: undefined },
      });
      return id;
    }

    const created = await tx.address.create({ data });
    return created.id;
  });

  revalidatePath("/profile/addresses");
  revalidatePath("/checkout");
  return { ok: true, addressId: savedId };
}

export async function setDefaultAddressAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const owned = await prisma.address.count({ where: { id, userId: user.id } });
  if (owned === 0) return;

  await prisma.$transaction([
    prisma.address.updateMany({
      where: { userId: user.id },
      data: { isDefault: false },
    }),
    prisma.address.update({ where: { id }, data: { isDefault: true } }),
  ]);

  revalidatePath("/profile/addresses");
  revalidatePath("/checkout");
}

export async function deleteAddressAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const address = await prisma.address.findFirst({
    where: { id, userId: user.id },
    include: { _count: { select: { shippedOrders: true } } },
  });
  if (!address) return;

  // Used by an order? Detach it there rather than break the delivery record.
  if (address._count.shippedOrders > 0) {
    // Scoped to this customer: an unscoped detach would clear the address
    // from another account's orders if ids ever collided.
    await prisma.rentalOrder.updateMany({
      where: { shippingAddressId: id, customerId: user.id },
      data: { shippingAddressId: null },
    });
  }

  await prisma.address.delete({ where: { id } });

  // Promote another address so the customer always has a default.
  if (address.isDefault) {
    const next = await prisma.address.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    });
    if (next) {
      await prisma.address.update({
        where: { id: next.id },
        data: { isDefault: true },
      });
    }
  }

  revalidatePath("/profile/addresses");
  revalidatePath("/checkout");
}
