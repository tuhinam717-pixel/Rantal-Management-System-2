import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { Boxes, Pencil } from "lucide-react";

import { AppImage } from "@/components/ui/app-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, EmptyState, TableRow } from "@/components/ui/data-table";
import { ListToolbar } from "@/components/ui/list-toolbar";
import { PageHeader } from "@/components/ui/page-header";
import { VendorProductDialog } from "@/components/vendor/vendor-product-form";
import { Pagination } from "@/components/ui/pagination";
import { pageMeta, resolvePage } from "@/lib/pagination";
import { resolveSort, textSearch, type SortOption } from "@/lib/list-query";
import { requireVendor } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "My products" };

const SORTS: SortOption<Prisma.ProductOrderByWithRelationInput>[] = [
  { value: "name", label: "Name A–Z", orderBy: { name: "asc" } },
  { value: "name-desc", label: "Name Z–A", orderBy: { name: "desc" } },
  { value: "stock", label: "Most stock", orderBy: { totalStock: "desc" } },
  { value: "popular", label: "Most rented", orderBy: { orderLines: { _count: "desc" } } },
];

const COLUMNS = [
  { key: "product", label: "Product" },
  { key: "sku", label: "SKU" },
  { key: "total", label: "Units", align: "right" as const },
  { key: "rented", label: "On rent", align: "right" as const },
  { key: "repair", label: "In repair", align: "right" as const },
  { key: "available", label: "Available", align: "right" as const },
  { key: "status", label: "Listed" },
  { key: "actions", label: "", align: "right" as const },
];

export default async function VendorProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; sort?: string }>;
}) {
  const { vendor } = await requireVendor();
  const { page, q, sort } = await searchParams;
  const pageInfo = resolvePage(page);
  const activeSort = resolveSort(sort, SORTS);

  const search = textSearch(q, ["name", "sku"]);

  // vendorId is fixed from the session, never from the query string.
  const where: Prisma.ProductWhereInput = {
    vendorId: vendor.id,
    ...(search ? { OR: search } : {}),
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: activeSort.orderBy,
      skip: pageInfo.skip,
      take: pageInfo.take,
      include: { category: { select: { name: true } } },
    }),
    prisma.product.count({ where }),
  ]);

  const meta = pageMeta(pageInfo, total);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My products"
        description={`${total} product${total === 1 ? "" : "s"} you supply to this business.`}
        actions={<VendorProductDialog />}
      />

      <ListToolbar
        basePath="/vendor/products"
        params={{ q, sort }}
        searchPlaceholder="Search name or SKU…"
        sortOptions={SORTS.map(({ value, label }) => ({ value, label }))}
      />

      {products.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title={q ? "No products match" : "No products yet"}
          description={
            q
              ? "Try a different search term."
              : "Nothing in the catalogue is linked to your account yet."
          }
        />
      ) : (
        <DataTable columns={COLUMNS} minWidth="54rem">
          {products.map((product) => {
            const available = Math.max(
              0,
              product.totalStock - product.reservedStock - product.underRepairStock
            );

            return (
              <TableRow key={product.id}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-brand-50">
                      {product.imageUrl && (
                        <AppImage
                          src={product.imageUrl}
                          alt=""
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink-900">
                        {product.name}
                      </p>
                      {product.category && (
                        <p className="text-xs text-ink-500">
                          {product.category.name}
                        </p>
                      )}
                    </div>
                  </div>
                </td>

                <td className="px-4 py-3 font-mono text-xs text-ink-500">
                  {product.sku}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-ink-900">
                  {product.totalStock}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-ink-700">
                  {product.reservedStock}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-ink-700">
                  {product.underRepairStock > 0 ? (
                    <span className="font-medium text-amber-700">
                      {product.underRepairStock}
                    </span>
                  ) : (
                    0
                  )}
                </td>
                <td className="px-4 py-3 text-right font-medium tabular-nums text-ink-900">
                  {available}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={product.isRentable ? "success" : "neutral"}>
                    {product.isRentable ? "Listed" : "Hidden"}
                  </Badge>
                </td>

                <td className="px-4 py-3 text-right">
                  <VendorProductDialog
                    initial={{
                      id: product.id,
                      name: product.name,
                      sku: product.sku,
                      description: product.description ?? "",
                      imageUrl: product.imageUrl ?? "",
                      totalStock: product.totalStock,
                      committed:
                        product.reservedStock + product.underRepairStock,
                    }}
                    trigger={
                      <Button variant="soft" size="sm">
                        <Pencil className="size-4" aria-hidden />
                        Edit
                      </Button>
                    }
                  />
                </td>
              </TableRow>
            );
          })}
        </DataTable>
      )}

      <Pagination
        meta={meta}
        basePath="/vendor/products"
        params={{ q, sort }}
        label="products"
      />
    </div>
  );
}
