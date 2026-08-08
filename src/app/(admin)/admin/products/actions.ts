"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { requireRole } from "@/lib/auth/current-user";
import { imageUrlSchema } from "@/lib/image";
import { prisma } from "@/lib/prisma";

export type FormState = { error?: string; ok?: boolean };

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const productSchema = z.object({
  name: z.string().min(2, "Name is required"),
  sku: z.string().min(2, "SKU is required"),
  description: z.string().optional(),
  imageUrl: imageUrlSchema,
  categoryId: z.string().optional(),
  vendorId: z.string().optional(),
  totalStock: z.coerce.number().int().min(0, "Stock cannot be negative"),
  depositType: z.enum(["FIXED", "PERCENTAGE"]),
  depositValue: z.coerce.number().min(0, "Deposit cannot be negative"),
  isRentable: z.coerce.boolean().optional(),
  /** Prices keyed by rental period id, submitted as price_<id>. */
});

/** Pulls `price_<rentalPeriodId>` fields out of the form. */
function extractPrices(formData: FormData) {
  const prices: { rentalPeriodId: string; price: number }[] = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("price_")) continue;
    const price = Number(value);
    if (Number.isFinite(price) && price > 0) {
      prices.push({ rentalPeriodId: key.slice(6), price });
    }
  }
  return prices;
}

async function defaultPricelistId() {
  const list = await prisma.pricelist.findFirst({
    where: { isDefault: true },
    select: { id: true },
  });
  if (!list) throw new Error("No default pricelist exists. Create one first.");
  return list.id;
}

export async function createProductAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireRole("ADMIN");

  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const data = parsed.data;
  const pricelistId = await defaultPricelistId();
  const prices = extractPrices(formData);

  if (prices.length === 0) {
    return { error: "Set a price for at least one rental period." };
  }

  try {
    await prisma.product.create({
      data: {
        name: data.name.trim(),
        slug: slugify(data.name),
        sku: data.sku.trim().toUpperCase(),
        description: data.description || null,
        imageUrl: data.imageUrl || null,
        categoryId: data.categoryId || null,
        vendorId: data.vendorId || null,
        totalStock: data.totalStock,
        depositType: data.depositType,
        depositValue: data.depositValue,
        isRentable: data.isRentable ?? true,
        pricelistItems: {
          create: prices.map((p) => ({ pricelistId, ...p })),
        },
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { error: "A product with that SKU or name already exists." };
    }
    console.error("[products/create]", error);
    return { error: "Could not create the product." };
  }

  revalidatePath("/admin/products");
  revalidatePath("/products");
  redirect("/admin/products");
}

export async function updateProductAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireRole("ADMIN");

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing product id." };

  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const data = parsed.data;
  const pricelistId = await defaultPricelistId();
  const prices = extractPrices(formData);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: {
          name: data.name.trim(),
          sku: data.sku.trim().toUpperCase(),
          description: data.description || null,
          imageUrl: data.imageUrl || null,
          categoryId: data.categoryId || null,
          vendorId: data.vendorId || null,
          totalStock: data.totalStock,
          depositType: data.depositType,
          depositValue: data.depositValue,
          isRentable: data.isRentable ?? false,
        },
      });

      for (const { rentalPeriodId, price } of prices) {
        await tx.pricelistItem.upsert({
          where: {
            pricelistId_productId_rentalPeriodId: {
              pricelistId,
              productId: id,
              rentalPeriodId,
            },
          },
          update: { price },
          create: { pricelistId, productId: id, rentalPeriodId, price },
        });
      }
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { error: "Another product already uses that SKU." };
    }
    console.error("[products/update]", error);
    return { error: "Could not save the product." };
  }

  revalidatePath("/admin/products");
  revalidatePath("/products");
  return { ok: true };
}

export async function deleteProductAction(formData: FormData) {
  await requireRole("ADMIN");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  // A product that has been rented can't be deleted without destroying order
  // history, so retire it from the catalogue instead.
  const rented = await prisma.rentalOrderLine.count({ where: { productId: id } });

  if (rented > 0) {
    await prisma.product.update({
      where: { id },
      data: { isRentable: false },
    });
  } else {
    await prisma.product.delete({ where: { id } });
  }

  revalidatePath("/admin/products");
  revalidatePath("/products");
}

// ---------------------------------------------------------------- variants

const variantSchema = z.object({
  productId: z.string().min(1),
  sku: z.string().min(2, "Variant SKU is required"),
  brand: z.string().optional(),
  manufacturer: z.string().optional(),
  color: z.string().optional(),
  size: z.string().optional(),
  stock: z.coerce.number().int().min(0),
});

export async function createVariantAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireRole("ADMIN");

  const parsed = variantSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the variant." };
  }

  try {
    await prisma.productVariant.create({
      data: {
        ...parsed.data,
        sku: parsed.data.sku.trim().toUpperCase(),
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { error: "That variant SKU is already taken." };
    }
    return { error: "Could not add the variant." };
  }

  revalidatePath(`/admin/products/${parsed.data.productId}`);
  return { ok: true };
}

export async function deleteVariantAction(formData: FormData) {
  await requireRole("ADMIN");
  const id = String(formData.get("id") ?? "");
  const productId = String(formData.get("productId") ?? "");
  if (!id) return;

  await prisma.productVariant.delete({ where: { id } });
  revalidatePath(`/admin/products/${productId}`);
}
