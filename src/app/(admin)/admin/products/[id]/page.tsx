import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { ProductForm } from "@/components/admin/product-form";
import { VariantManager } from "@/components/admin/variant-manager";
import { requireRole } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Edit product" };

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("ADMIN");
  const { id } = await params;

  const [product, categories, periods, defaultList, vendors] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: { variants: { orderBy: { sku: "asc" } } },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.rentalPeriod.findMany({ where: { isActive: true }, orderBy: { id: "asc" } }),
    prisma.pricelist.findFirst({ where: { isDefault: true }, select: { id: true } }),
    prisma.vendor.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!product) notFound();

  const prices = defaultList
    ? await prisma.pricelistItem.findMany({
        where: { productId: id, pricelistId: defaultList.id },
      })
    : [];

  const priceByPeriod = new Map(
    prices.map((p) => [p.rentalPeriodId, Number(p.price)])
  );

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-1 text-sm font-medium text-ink-500 hover:text-ink-900"
        >
          <ChevronLeft className="size-4" aria-hidden />
          Products
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink-900">
          {product.name}
        </h1>
        <p className="mt-1 font-mono text-xs text-ink-500">{product.sku}</p>
      </div>

      <ProductForm
        mode="edit"
        categories={categories}
        vendors={vendors}
        initial={{
          id: product.id,
          name: product.name,
          sku: product.sku,
          description: product.description ?? "",
          imageUrl: product.imageUrl ?? "",
          categoryId: product.categoryId ?? "",
          vendorId: product.vendorId ?? "",
          totalStock: product.totalStock,
          depositType: product.depositType,
          depositValue: Number(product.depositValue),
          isRentable: product.isRentable,
        }}
        periods={periods.map((p) => ({
          id: p.id,
          name: p.name,
          unit: p.unit,
          price: priceByPeriod.get(p.id) ?? 0,
        }))}
      />

      <VariantManager productId={product.id} variants={product.variants} />
    </div>
  );
}
