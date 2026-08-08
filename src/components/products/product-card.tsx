import Link from "next/link";
import { ImageOff } from "lucide-react";

import { AppImage } from "@/components/ui/app-image";

import { formatCurrency } from "@/lib/utils";
import type { ProductVM } from "@/types";

const UNIT_LABEL: Record<string, string> = {
  HOUR: "hour",
  DAY: "day",
  WEEK: "week",
  MONTH: "month",
};

export function ProductCard({ product }: { product: ProductVM }) {
  const soldOut = product.available === 0;

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
    >
      <div className="relative aspect-4/3 overflow-hidden bg-slate-100">
        {product.imageUrl ? (
          <AppImage
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <span className="grid size-full place-items-center text-slate-300">
            <ImageOff className="size-8" aria-hidden />
          </span>
        )}

        {soldOut && (
          <span className="absolute left-3 top-3 rounded-full bg-red-600 px-2.5 py-1 text-xs font-medium text-white">
            Out of stock
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        {product.category && (
          <span className="text-xs font-medium uppercase tracking-wide text-brand-600">
            {product.category}
          </span>
        )}

        <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-ink-900">
          {product.name}
        </h3>

        <div className="mt-auto pt-3">
          <p className="text-base font-semibold text-ink-900">
            {formatCurrency(product.fromPrice)}
            <span className="text-sm font-normal text-ink-500">
              {" "}
              / {UNIT_LABEL[product.fromUnit] ?? "day"}
            </span>
          </p>
          <p className="mt-0.5 text-xs text-ink-500">
            {formatCurrency(product.depositAmount)} refundable deposit
          </p>
          <p className="mt-1.5 text-xs text-ink-500">
            {soldOut ? "None available" : `${product.available} available`}
          </p>
        </div>
      </div>
    </Link>
  );
}
