import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Boxes, ImageOff, Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  CardGrid,
  DataTable,
  EmptyState,
  TableRow,
} from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { ViewToggle } from "@/components/ui/view-toggle";
import { resolveView } from "@/lib/view-mode";
import { DeleteButton } from "@/components/admin/delete-button";
import { NewProductDialog } from "@/components/admin/new-product-dialog";
import { deleteProductAction } from "./actions";
import { requireRole } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { cn, formatCurrency } from "@/lib/utils";

export const metadata: Metadata = { title: "Products" };

const COLUMNS = [
  { key: "product", label: "Product" },
  { key: "sku", label: "SKU" },
  { key: "category", label: "Category" },
  { key: "stock", label: "Stock", align: "right" as const },
  { key: "deposit", label: "Deposit", align: "right" as const },
  { key: "variants", label: "Variants", align: "right" as const },
  { key: "actions", label: "", align: "right" as const },
];

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  await requireRole("ADMIN");
  const view = resolveView((await searchParams).view);

  const [products, categories, periods] = await Promise.all([
    prisma.product.findMany({
      orderBy: { name: "asc" },
      include: {
        category: true,
        variants: true,
        _count: { select: { orderLines: true } },
      },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.rentalPeriod.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" },
    }),
  ]);

  const periodOptions = periods.map((p) => ({
    id: p.id,
    name: p.name,
    unit: p.unit,
    price: 0,
  }));

  const depositLabel = (p: (typeof products)[number]) =>
    p.depositType === "PERCENTAGE"
      ? `${Number(p.depositValue)}%`
      : formatCurrency(Number(p.depositValue));

  const confirmFor = (p: (typeof products)[number]) =>
    p._count.orderLines > 0
      ? `${p.name} has rental history, so it will be retired rather than deleted. Continue?`
      : `Delete ${p.name}? This cannot be undone.`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description={`${products.length} in the catalogue`}
        actions={
          <>
            <ViewToggle current={view} />
            <NewProductDialog categories={categories} periods={periodOptions} />
          </>
        }
      />

      {products.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="No products yet"
          description="Add your first rentable product to start taking bookings."
          action={
            <NewProductDialog categories={categories} periods={periodOptions} />
          }
        />
      ) : view === "cards" ? (
        <CardGrid>
          {products.map((product) => {
            const available = Math.max(
              0,
              product.totalStock - product.reservedStock
            );

            return (
              <Card
                key={product.id}
                hover
                className={cn(
                  "flex flex-col overflow-hidden",
                  !product.isRentable && "opacity-60"
                )}
              >
                <div className="relative aspect-4/3 bg-brand-50">
                  {product.imageUrl ? (
                    <Image
                      src={product.imageUrl}
                      alt=""
                      fill
                      sizes="(min-width: 1280px) 25vw, (min-width: 640px) 45vw, 90vw"
                      className="object-cover"
                    />
                  ) : (
                    <span className="grid size-full place-items-center text-brand-400">
                      <ImageOff className="size-7" aria-hidden />
                    </span>
                  )}

                  <div className="absolute left-3 top-3 flex gap-1.5">
                    {!product.isRentable && <Badge tone="neutral">Retired</Badge>}
                    {available === 0 && product.isRentable && (
                      <Badge tone="danger">All out</Badge>
                    )}
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-4">
                  {product.category && (
                    <span className="text-xs font-medium uppercase tracking-wide text-brand-700">
                      {product.category.name}
                    </span>
                  )}
                  <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-ink-900">
                    {product.name}
                  </h3>
                  <p className="mt-0.5 font-mono text-xs text-ink-500">
                    {product.sku}
                  </p>

                  <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3 text-center">
                    <div>
                      <dt className="text-xs text-ink-500">Available</dt>
                      <dd className="text-sm font-semibold text-ink-900">
                        {available}
                        <span className="font-normal text-ink-500">
                          /{product.totalStock}
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-ink-500">Deposit</dt>
                      <dd className="text-sm font-semibold text-ink-900">
                        {depositLabel(product)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-ink-500">Variants</dt>
                      <dd className="text-sm font-semibold text-ink-900">
                        {product.variants.length}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-4 flex items-center gap-1">
                    <Link
                      href={`/admin/products/${product.id}`}
                      className="flex-1"
                    >
                      <Button variant="soft" size="sm" className="w-full">
                        <Pencil className="size-4" aria-hidden />
                        Edit
                      </Button>
                    </Link>
                    <form action={deleteProductAction}>
                      <input type="hidden" name="id" value={product.id} />
                      <DeleteButton label="" confirmMessage={confirmFor(product)} />
                    </form>
                  </div>
                </div>
              </Card>
            );
          })}
        </CardGrid>
      ) : (
        <DataTable columns={COLUMNS} minWidth="56rem">
          {products.map((product) => {
            const available = Math.max(
              0,
              product.totalStock - product.reservedStock
            );

            return (
              <TableRow
                key={product.id}
                className={cn(!product.isRentable && "opacity-55")}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-brand-50">
                      {product.imageUrl ? (
                        <Image
                          src={product.imageUrl}
                          alt=""
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      ) : (
                        <span className="grid size-full place-items-center text-brand-400">
                          <ImageOff className="size-4" aria-hidden />
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink-900">
                        {product.name}
                      </p>
                      {!product.isRentable && (
                        <p className="text-xs text-ink-500">Retired</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-ink-500">
                  {product.sku}
                </td>
                <td className="px-4 py-3 text-ink-700">
                  {product.category?.name ?? "Uncategorised"}
                </td>
                <td className="px-4 py-3 text-right text-ink-700">
                  <span className="font-medium text-ink-900">{available}</span>
                  <span className="text-ink-500"> / {product.totalStock}</span>
                </td>
                <td className="px-4 py-3 text-right text-ink-700">
                  {depositLabel(product)}
                </td>
                <td className="px-4 py-3 text-right text-ink-500">
                  {product.variants.length}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Link href={`/admin/products/${product.id}`}>
                      <Button variant="ghost" size="sm">
                        <Pencil className="size-4" aria-hidden />
                        Edit
                      </Button>
                    </Link>
                    <form action={deleteProductAction}>
                      <input type="hidden" name="id" value={product.id} />
                      <DeleteButton
                        label={product._count.orderLines > 0 ? "Retire" : "Delete"}
                        confirmMessage={confirmFor(product)}
                      />
                    </form>
                  </div>
                </td>
              </TableRow>
            );
          })}
        </DataTable>
      )}
    </div>
  );
}
