import "server-only";

import { prisma } from "@/lib/prisma";
import type { ProductVM, RentalPeriodVM, RentalUnit } from "@/types";

/**
 * The pricelist that applies right now: a time-bound one whose window covers
 * today wins over the default. The brief allows several, so we take the most
 * recently created match rather than assuming there is only one.
 */
export async function getActivePricelistId(now = new Date()): Promise<string> {
  const timeBound = await prisma.pricelist.findFirst({
    where: {
      isActive: true,
      isDefault: false,
      OR: [
        { validFrom: { lte: now }, validTo: { gte: now } },
        { validFrom: { lte: now }, validTo: null },
      ],
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (timeBound) return timeBound.id;

  const fallback = await prisma.pricelist.findFirst({
    where: { isDefault: true, isActive: true },
    select: { id: true },
  });

  if (!fallback) {
    throw new Error(
      "No default pricelist configured. Run `npm run db:seed` or create one under Admin > Pricelists."
    );
  }

  return fallback.id;
}

export async function getCategories() {
  return prisma.category.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true },
  });
}

export async function getRentalPeriods() {
  return prisma.rentalPeriod.findMany({
    where: { isActive: true },
    orderBy: { id: "asc" },
  });
}

/** Stock left after subtracting what's already reserved by open rentals. */
function availableOf(totalStock: number, reservedStock: number) {
  return Math.max(0, totalStock - reservedStock);
}

export async function listProducts(options?: {
  category?: string;
  search?: string;
}): Promise<ProductVM[]> {
  const pricelistId = await getActivePricelistId();

  const products = await prisma.product.findMany({
    where: {
      isRentable: true,
      ...(options?.category ? { category: { slug: options.category } } : {}),
      ...(options?.search
        ? {
            OR: [
              { name: { contains: options.search, mode: "insensitive" } },
              { sku: { contains: options.search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
    include: {
      category: true,
      variants: true,
      pricelistItems: {
        where: { pricelistId },
        include: { rentalPeriod: true },
      },
    },
  });

  return products.map((product) => {
    // "from ₹X / unit" on the card comes from the cheapest configured rate.
    const cheapest = product.pricelistItems.reduce<
      { price: number; unit: RentalUnit } | null
    >((best, item) => {
      const price = Number(item.price);
      return !best || price < best.price
        ? { price, unit: item.rentalPeriod.unit }
        : best;
    }, null);

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      description: product.description ?? undefined,
      imageUrl: product.imageUrl ?? undefined,
      category: product.category?.name,
      available: availableOf(product.totalStock, product.reservedStock),
      fromPrice: cheapest?.price ?? 0,
      fromUnit: cheapest?.unit ?? "DAY",
      depositAmount: Number(product.depositValue),
      variants: product.variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        brand: v.brand ?? undefined,
        manufacturer: v.manufacturer ?? undefined,
        colour: v.color ?? undefined,
        size: v.size ?? undefined,
        stock: v.stock,
      })),
    };
  });
}

export async function getProductBySlug(slug: string) {
  const pricelistId = await getActivePricelistId();

  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      category: true,
      variants: true,
      pricelistItems: {
        where: { pricelistId },
        include: { rentalPeriod: true },
      },
    },
  });

  if (!product) return null;

  const periods: RentalPeriodVM[] = product.pricelistItems
    .map((item) => ({
      id: item.rentalPeriod.id,
      name: item.rentalPeriod.name,
      unit: item.rentalPeriod.unit as RentalUnit,
      duration: item.rentalPeriod.duration,
      price: Number(item.price),
    }))
    .sort((a, b) => a.price - b.price);

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    description: product.description ?? undefined,
    imageUrl: product.imageUrl ?? undefined,
    category: product.category?.name,
    available: availableOf(product.totalStock, product.reservedStock),
    depositAmount: Number(product.depositValue),
    depositType: product.depositType,
    variants: product.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      brand: v.brand ?? undefined,
      manufacturer: v.manufacturer ?? undefined,
      colour: v.color ?? undefined,
      size: v.size ?? undefined,
      stock: v.stock,
    })),
    periods,
  };
}
