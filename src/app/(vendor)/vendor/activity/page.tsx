import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { ScrollText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { DataTable, EmptyState, TableRow } from "@/components/ui/data-table";
import { DateRange } from "@/components/ui/date-range";
import { ListToolbar } from "@/components/ui/list-toolbar";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { StatusBadge } from "@/components/orders/status-badge";
import { pageMeta, resolvePage } from "@/lib/pagination";
import { resolveSort, textSearch, type SortOption } from "@/lib/list-query";
import { requireVendor } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import type { OrderStatus } from "@/types";

export const metadata: Metadata = { title: "Rental activity" };

const SORTS: SortOption<Prisma.RentalOrderLineOrderByWithRelationInput>[] = [
  { value: "recent", label: "Most recent", orderBy: { order: { rentalStart: "desc" } } },
  { value: "oldest", label: "Oldest first", orderBy: { order: { rentalStart: "asc" } } },
  { value: "due", label: "Return date (soonest)", orderBy: { order: { rentalEnd: "asc" } } },
  { value: "product", label: "Product A–Z", orderBy: { product: { name: "asc" } } },
];

const COLUMNS = [
  { key: "product", label: "Product" },
  { key: "order", label: "Order" },
  { key: "qty", label: "Units", align: "right" as const },
  { key: "period", label: "Rental period" },
  { key: "status", label: "Status" },
];

export default async function VendorActivityPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    sort?: string;
    state?: string;
  }>;
}) {
  const { vendor } = await requireVendor();
  const { page, q, sort, state } = await searchParams;
  const pageInfo = resolvePage(page);
  const activeSort = resolveSort(sort, SORTS);
  const now = new Date();

  const search = textSearch(q, ["product.name", "product.sku"]);

  // Rows are order *lines* filtered to this vendor's products, so an order
  // that also contains another supplier's stock only surfaces the part that
  // belongs here.
  const where: Prisma.RentalOrderLineWhereInput = {
    product: { vendorId: vendor.id },
    ...(state === "out"
      ? { order: { returnedAt: null, status: { notIn: ["COMPLETED", "CANCELLED"] } } }
      : {}),
    ...(state === "overdue"
      ? {
          order: {
            returnedAt: null,
            rentalEnd: { lt: now },
            status: { notIn: ["COMPLETED", "CANCELLED"] },
          },
        }
      : {}),
    ...(state === "returned" ? { order: { returnedAt: { not: null } } } : {}),
    ...(search ? { OR: search } : {}),
  };

  const [lines, total] = await Promise.all([
    prisma.rentalOrderLine.findMany({
      where,
      orderBy: activeSort.orderBy,
      skip: pageInfo.skip,
      take: pageInfo.take,
      include: {
        product: { select: { name: true, sku: true } },
        // Customer identity is deliberately not selected — a supplier has no
        // business knowing who rented the unit.
        order: {
          select: {
            number: true,
            status: true,
            rentalStart: true,
            rentalEnd: true,
            returnedAt: true,
          },
        },
      },
    }),
    prisma.rentalOrderLine.count({ where }),
  ]);

  const meta = pageMeta(pageInfo, total);
  const listParams = { q, sort, state };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rental activity"
        description="Where your units have gone. Customer details are not shared."
      />

      <ListToolbar
        basePath="/vendor/activity"
        params={listParams}
        searchPlaceholder="Search product or SKU…"
        sortOptions={SORTS.map(({ value, label }) => ({ value, label }))}
        filters={[
          {
            key: "state",
            options: [
              { value: undefined, label: "All" },
              { value: "out", label: "Currently out" },
              { value: "overdue", label: "Overdue" },
              { value: "returned", label: "Returned" },
            ],
          },
        ]}
      />

      {lines.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title={q || state ? "No activity matches" : "No rentals yet"}
          description={
            q || state
              ? "Try a different search term or filter."
              : "Once your products are rented out, every booking shows up here."
          }
        />
      ) : (
        <DataTable columns={COLUMNS} minWidth="52rem">
          {lines.map((line) => {
            const overdue =
              !line.order.returnedAt &&
              line.order.rentalEnd < now &&
              !["COMPLETED", "CANCELLED"].includes(line.order.status);

            return (
              <TableRow key={line.id}>
                <td className="px-4 py-3">
                  <p className="font-medium text-ink-900">{line.product.name}</p>
                  <p className="font-mono text-xs text-ink-500">
                    {line.product.sku}
                  </p>
                </td>

                <td className="px-4 py-3 font-mono text-xs text-ink-700">
                  {line.order.number}
                </td>

                <td className="px-4 py-3 text-right tabular-nums text-ink-900">
                  {line.quantity}
                </td>

                <td className="px-4 py-3 text-ink-500">
                  <DateRange
                    from={line.order.rentalStart}
                    to={line.order.rentalEnd}
                  />
                </td>

                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={line.order.status as OrderStatus} />
                    {overdue && <Badge tone="danger">Overdue</Badge>}
                  </div>
                </td>
              </TableRow>
            );
          })}
        </DataTable>
      )}

      <Pagination
        meta={meta}
        basePath="/vendor/activity"
        params={listParams}
        label="rentals"
      />
    </div>
  );
}
