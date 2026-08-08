import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { ProductForm } from "@/components/admin/product-form";
import { requireRole } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "New product" };

export default async function NewProductPage() {
  await requireRole("ADMIN");

  const [categories, periods] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.rentalPeriod.findMany({ where: { isActive: true }, orderBy: { id: "asc" } }),
  ]);

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
          New product
        </h1>
      </div>

      <ProductForm
        mode="create"
        categories={categories}
        periods={periods.map((p) => ({
          id: p.id,
          name: p.name,
          unit: p.unit,
          price: 0,
        }))}
      />
    </div>
  );
}
