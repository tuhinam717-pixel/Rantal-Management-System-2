import type { Metadata } from "next";

import { ProductCard } from "@/components/products/product-card";
import { ListToolbar } from "@/components/ui/list-toolbar";
import { Pagination } from "@/components/ui/pagination";
import { resolveSort, type SortOption } from "@/lib/list-query";
import type { Prisma } from "@prisma/client";
import { getCategories, listProducts } from "@/server/services/catalog";
import { pageMeta, resolvePage } from "@/lib/pagination";

export const metadata: Metadata = { title: "Browse rentals" };

const SORTS: SortOption<Prisma.ProductOrderByWithRelationInput>[] = [
  { value: "name", label: "Name A–Z", orderBy: { name: "asc" } },
  { value: "name-desc", label: "Name Z–A", orderBy: { name: "desc" } },
  { value: "newest", label: "Newest first", orderBy: { createdAt: "desc" } },
  { value: "popular", label: "Most rented", orderBy: { orderLines: { _count: "desc" } } },
];

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    q?: string;
    page?: string;
    sort?: string;
  }>;
}) {
  const { category, q, page, sort } = await searchParams;
  const pageInfo = resolvePage(page, 12);
  const activeSort = resolveSort(sort, SORTS);

  const [{ items: products, total }, categories] = await Promise.all([
    listProducts({
      category,
      search: q,
      skip: pageInfo.skip,
      take: pageInfo.take,
      orderBy: activeSort.orderBy,
    }),
    getCategories(),
  ]);

  const meta = pageMeta(pageInfo, total);
  const listParams = { category, q, sort };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          Browse rentals
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          {total} {total === 1 ? "product" : "products"} available to rent.
        </p>
      </div>

      <ListToolbar
        basePath="/products"
        params={listParams}
        searchPlaceholder="Search by name or SKU…"
        sortOptions={SORTS.map(({ value, label }) => ({ value, label }))}
        filters={[
          {
            key: "category",
            options: [
              { value: undefined, label: "All" },
              ...categories.map((c) => ({ value: c.slug, label: c.name })),
            ],
          },
        ]}
      />

      {products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-sm text-ink-500">
            No products match that search. Try a different term or category.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          <Pagination
            meta={meta}
            basePath="/products"
            params={listParams}
            label="products"
          />
        </>
      )}
    </div>
  );
}
