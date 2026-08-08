import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Star } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { DeleteButton } from "@/components/admin/delete-button";
import { PriceGrid } from "@/components/admin/price-grid";
import { NewPricelistDialog } from "@/components/admin/new-pricelist-form";
import { SetDefaultPricelist } from "@/components/admin/set-default-pricelist";
import {
  togglePricelistAction,
  deletePricelistAction,
} from "@/app/(admin)/admin/config-actions";
import { requireRole } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { cn, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Pricelists" };

export default async function AdminPricelistsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  await requireRole("ADMIN");
  const { edit } = await searchParams;

  const [pricelists, products, periods] = await Promise.all([
    prisma.pricelist.findMany({
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      include: { _count: { select: { items: true } } },
    }),
    prisma.product.findMany({
      where: { isRentable: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, sku: true },
    }),
    prisma.rentalPeriod.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" },
    }),
  ]);

  const defaultList = pricelists.find((p) => p.isDefault);
  const brokenDefault = Boolean(defaultList && defaultList._count.items === 0);

  const editing =
    pricelists.find((p) => p.id === edit) ?? (edit ? undefined : defaultList);

  const items = editing
    ? await prisma.pricelistItem.findMany({ where: { pricelistId: editing.id } })
    : [];

  const prices = Object.fromEntries(
    items.map((i) => [`${i.productId}_${i.rentalPeriodId}`, Number(i.price)])
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Pricelists"
        description="One default list applies to every product. Time-bound lists override it while they are active and inside their date range."
        actions={<NewPricelistDialog />}
      />

      {brokenDefault && (
        <Alert tone="error">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <AlertTriangle className="size-4" aria-hidden />
            The default pricelist has no rates.
          </span>{" "}
          Every product is currently unpriced, so the catalogue, checkout and
          quotations will fail. Add rates to it below, or make a pricelist that
          has rates the default.
        </Alert>
      )}

      <div>
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {pricelists.map((list) => (
            <li
              key={list.id}
              className={cn(
                "rounded-2xl border bg-surface p-5 shadow-card",
                editing?.id === list.id
                  ? "border-brand-500 ring-1 ring-brand-500"
                  : "border-line"
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-ink-900">{list.name}</span>
                {list.isDefault && (
                  <Badge tone="brand">
                    <Star className="size-3" aria-hidden />
                    Default
                  </Badge>
                )}
                <Badge tone={list.isActive ? "success" : "neutral"}>
                  {list.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>

              <p className="mt-2 text-xs text-ink-500">
                <span className="font-medium text-ink-700">
                  {list._count.items}
                </span>{" "}
                rates
                {list.validFrom && list.validTo
                  ? ` · valid ${formatDate(list.validFrom)} to ${formatDate(list.validTo)}`
                  : " · always applicable"}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-1 border-t border-line pt-3">
                <Link href={`/admin/pricelists?edit=${list.id}`}>
                  <Button variant="soft" size="sm">
                    Edit rates
                  </Button>
                </Link>

                {!list.isDefault && (
                  <>
                    <SetDefaultPricelist
                      id={list.id}
                      rateCount={list._count.items}
                    />

                    <form action={togglePricelistAction}>
                      <input type="hidden" name="id" value={list.id} />
                      <input
                        type="hidden"
                        name="isActive"
                        value={String(!list.isActive)}
                      />
                      <Button type="submit" variant="ghost" size="sm">
                        {list.isActive ? "Deactivate" : "Activate"}
                      </Button>
                    </form>

                    <form action={deletePricelistAction}>
                      <input type="hidden" name="id" value={list.id} />
                      <DeleteButton
                        label=""
                        confirmMessage={`Delete pricelist "${list.name}" and all its rates?`}
                      />
                    </form>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {editing && (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-ink-900">
              Rates — {editing.name}
            </h2>
            <p className="mt-1 text-sm text-ink-500">
              Leave a cell blank to stop offering that product for that period.
            </p>
          </div>

          <PriceGrid
            pricelistId={editing.id}
            products={products}
            periods={periods.map((p) => ({ id: p.id, name: p.name }))}
            prices={prices}
          />
        </section>
      )}
    </div>
  );
}
