import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ChevronLeft, ImageOff } from "lucide-react";

import { AppImage } from "@/components/ui/app-image";
import { RentalConfigurator } from "@/components/products/rental-configurator";
import { getProductBySlug } from "@/server/services/catalog";
import { formatCurrency } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  return { title: product?.name ?? "Product" };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) notFound();

  const variant = product.variants[0];

  const specs = [
    ["SKU", product.sku],
    ["Brand", variant?.brand],
    ["Manufacturer", variant?.manufacturer],
    ["Colour", variant?.colour],
    ["Size", variant?.size],
  ].filter(([, value]) => Boolean(value)) as [string, string][];

  return (
    <div className="space-y-6">
      <Link
        href="/products"
        className="inline-flex items-center gap-1 text-sm font-medium text-ink-500 hover:text-ink-900"
      >
        <ChevronLeft className="size-4" aria-hidden />
        Back to catalogue
      </Link>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-5">
          <div className="relative aspect-4/3 overflow-hidden rounded-xl bg-slate-100">
            {product.imageUrl ? (
              <AppImage
                src={product.imageUrl}
                alt={product.name}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
                priority
              />
            ) : (
              <span className="grid size-full place-items-center text-slate-300">
                <ImageOff className="size-10" aria-hidden />
              </span>
            )}
          </div>

          {specs.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-ink-900">
                Specifications
              </h2>
              <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                {specs.map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4 text-sm">
                    <dt className="text-ink-500">{label}</dt>
                    <dd className="text-right font-medium text-ink-900">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div>
            {product.category && (
              <span className="text-xs font-medium uppercase tracking-wide text-brand-600">
                {product.category}
              </span>
            )}
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink-900">
              {product.name}
            </h1>
            <p className="mt-1.5 text-sm text-ink-500">
              {product.available > 0
                ? `${product.available} available to rent`
                : "Currently out of stock"}
              {" · "}
              {formatCurrency(product.depositAmount)} refundable deposit
            </p>
            {product.description && (
              <p className="mt-3 text-sm leading-relaxed text-ink-700">
                {product.description}
              </p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <RentalConfigurator
              productId={product.id}
              periods={product.periods}
              depositPerItem={product.depositAmount}
              available={product.available}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
