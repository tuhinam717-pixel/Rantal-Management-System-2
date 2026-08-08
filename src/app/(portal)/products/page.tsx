import type { Metadata } from "next";
import Link from "next/link";

import { ProductCard } from "@/components/products/product-card";
import { getCategories, listProducts } from "@/server/services/catalog";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Browse rentals" };

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const { category, q } = await searchParams;
  const [products, categories] = await Promise.all([
    listProducts({ category, search: q }),
    getCategories(),
  ]);

  const filters = [{ slug: undefined, name: "All" }, ...categories];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          Browse rentals
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          {products.length} {products.length === 1 ? "product" : "products"}{" "}
          available to rent.
        </p>
      </div>

      <form className="flex gap-2" action="/products">
        {category && <input type="hidden" name="category" value={category} />}
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name or SKU…"
          className="w-full max-w-sm rounded-lg border-0 bg-white py-2.5 pl-3.5 text-sm text-ink-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-brand-600"
        />
        <button
          type="submit"
          className="rounded-lg bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700"
        >
          Search
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => {
          const active = category === filter.slug;
          const href = filter.slug ? `/products?category=${filter.slug}` : "/products";

          return (
            <Link
              key={filter.name}
              href={href}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-brand-600 text-white"
                  : "bg-white text-ink-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-50"
              )}
            >
              {filter.name}
            </Link>
          );
        })}
      </div>

      {products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-sm text-ink-500">
            No products match that search. Try a different term or category.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
