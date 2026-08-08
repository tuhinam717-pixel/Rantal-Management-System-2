"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { requireRole } from "@/lib/auth/current-user";
import { imageUrlSchema } from "@/lib/image";
import { prisma } from "@/lib/prisma";

export type FormState = {
  error?: string;
  ok?: boolean;
  /** Set on create so the quotation builder can select the new customer. */
  customer?: { id: string; name: string; email: string };
};

const customerSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s()]{7,20}$/, "Enter a valid phone number")
    .or(z.literal(""))
    .optional(),
  imageUrl: imageUrlSchema,
  /** Only meaningful on create; blank means "generate one". */
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .or(z.literal(""))
    .optional(),
});

/**
 * A walk-in customer has no password of their own yet — the brief has the admin
 * creating the record at the counter. A random one is set so the account is
 * never left with a guessable secret; the customer resets it from the portal.
 */
function randomPassword() {
  return `Rf-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 6)}`;
}

export async function saveCustomerAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireRole("ADMIN");

  const parsed = customerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the details." };
  }

  const { id, name, email, phone, imageUrl, password } = parsed.data;

  // Unique on the table, but checking first turns a 500 into a usable message.
  const clash = await prisma.user.findFirst({
    where: { email, ...(id ? { NOT: { id } } : {}) },
    select: { id: true },
  });
  if (clash) {
    return { error: `${email} is already registered.` };
  }

  if (id) {
    // Scoped to CUSTOMER so an admin account can't be edited through this form.
    const existing = await prisma.user.findFirst({
      where: { id, role: "CUSTOMER" },
      select: { id: true },
    });
    if (!existing) return { error: "That customer no longer exists." };

    await prisma.user.update({
      where: { id },
      data: {
        name,
        email,
        phone: phone || null,
        imageUrl: imageUrl || null,
        ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {}),
      },
    });

    revalidatePath("/admin/customers");
    return { ok: true };
  }

  const created = await prisma.user.create({
    data: {
      name,
      email,
      phone: phone || null,
      imageUrl: imageUrl || null,
      role: "CUSTOMER",
      passwordHash: await bcrypt.hash(password || randomPassword(), 12),
    },
    select: { id: true, name: true, email: true },
  });

  revalidatePath("/admin/customers");
  revalidatePath("/admin/quotations");
  return { ok: true, customer: created };
}

export async function setCustomerActiveAction(formData: FormData) {
  await requireRole("ADMIN");

  const id = String(formData.get("id") ?? "");
  const next = formData.get("isActive") === "true";
  if (!id) return;

  // updateMany scopes by role, so an admin id passed by hand changes nothing.
  await prisma.user.updateMany({
    where: { id, role: "CUSTOMER" },
    data: { isActive: next },
  });

  revalidatePath("/admin/customers");
}
