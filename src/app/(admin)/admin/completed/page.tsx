import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Archive } from "lucide-react";

import { DataTable, EmptyState, TableRow } from "@/components/ui/data-table";
import { DateRange } from "@/components/ui/date-range";
import { ListToolbar } from "@/components/ui/list-toolbar";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { StatusBadge } from "@/components/orders/status-badge";
import { pageMeta, resolvePage } from "@/lib/pagination";
import {
  resolveEnumFilter,
  resolveSort,
  textSearch,
  type SortOption,
} from "@/lib/list-query";
import { requireRole } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { OrderStatus } from "@/types";

export const metadata: Metadata = { title: "Completed orders" };

const SORTS: SortOption<Prisma.RentalOrderOrderByWithRelationInput>[] = [
  { value: "recent", label: "Settled most recently", orderBy: { returnedAt: "desc" } },
  { value: "oldest", label: "Settled longest ago", orderBy: { returnedAt: "asc" } },
  { value: "value", label: "Highest value", orderBy: { total: "desc" } },
  { value: "fees", label: "Highest late fee", orderBy: { lateFeeTotal: "desc" } },
  { value: "number", label: "Order number", orderBy: { number: "asc" } },
];

const OUTCOME_FILTERS = [
  { value: undefined, label: "All" },
  { value: "clean", label: "No late fee" },
  { value: "late", label: "Late fee charged" },
  { value: "cancelled", label: "Cancelled" },
];

const COLUMNS = [
  { key: "order", label: "Order" },
  { key: "customer", label: "Customer" },
  { key: "items", label: "Items" },
  { key: "period", label: "Rental period" },
  { key: "settled", label: "Settled" },
  { key: "fee", label: "Late fee", align: "right" as const },
  { key: "total", label: "Total", align: "right" as const },
  { key: "status", label: "Outcome" },
];

export default async function AdminCompletedPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    sort?: string;
    outcome?: string;
  }>;
}) {
  await requireRole("ADMIN");
  const { page, q, sort, outcome } = await searchParams;
  const pageInfo = resolvePage(page);
  const activeSort = resolveSort(sort, SORTS);

  const safeOutcome = resolveEnumFilter(
    outcome,
    OUTCOME_FILTERS.map((f) => f.value)
  );

  const search = textSearch(q, [
    "number",
    "customer.name",
    "customer.email",
    "lines.some.product.name",
  ]);

  // This is the archive: everything that has finished, one way or the other.
  const outcomeWhere: Prisma.RentalOrderWhereInput =
    safeOutcome === "clean"
      ? { status: { in: ["RETURNED", "COMPLETED"] }, lateFeeTotal: { lte: 0 } }
      : safeOutcome === "late"
        ? { status: { in: ["RETURNED", "COMPLETED"] }, lateFeeTotal: { gt: 0 } }
        : safeOutcome === "cancelled"
          ? { status: "CANCELLED" }
          : { status: { in: ["RETURNED", "COMPLETED", "CANCELLED"] } };

  const where: Prisma.RentalOrderWhereInput = {
    ...outcomeWhere,
    ...(search ? { OR: search } : {}),
  };

  const [orders, total, revenue, fees] = await Promise.all([
    prisma.rentalOrder.findMany({
      where,
      orderBy: activeSort.orderBy,
      skip: pageInfo.skip,
      take: pageInfo.take,
      include: {
        customer: { select: { name: true, email: true } },
        lines: { include: { product: { select: { name: true } } } },
      },
    }),
    prisma.rentalOrder.count({ where }),
    prisma.rentalOrder.aggregate({
      where: { status: { in: ["RETURNED", "COMPLETED"] } },
      _sum: { subtotal: true },
    }),
    prisma.rentalOrder.aggregate({
      where: { status: { in: ["RETURNED", "COMPLETED"] } },
      _sum: { lateFeeTotal: true },
    }),
  ]);

  const meta = pageMeta(pageInfo, total);
  const listParams = { q, sort, outcome };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Completed orders"
        description={`${total} finished · ${formatCurrency(Number(revenue._sum.subtotal ?? 0))} rent earned · ${formatCurrency(Number(fees._sum.lateFeeTotal ?? 0))} in late fees`}
      />

      <ListToolbar
        basePath="/admin/completed"
        params={listParams}
        searchPlaceholder="Search order no., customer or product…"
        sortOptions={SORTS.map(({ value, label }) => ({ value, label }))}
        filters={[{ key: "outcome", label: "Outcome", options: OUTCOME_FILTERS }]}
      />

      {orders.length === 0 ? (
        <EmptyState
          icon={Archive}
          title={q || outcome ? "Nothing matches" : "Nothing completed yet"}
          description={
            q || outcome
              ? "Try a different search term or outcome."
              : "Rentals move here once they are returned and the deposit is settled."
          }
        />
      ) : (
        <DataTable columns={COLUMNS} minWidth="70rem">
          {orders.map((order) => (
            <TableRow key={order.id}>
              <td className="px-4 py-3">
                <Link
                  href={`/admin/orders/${order.id}`}
                  className="font-medium text-brand-700 hover:text-brand-800"
                >
                  {order.number}
                </Link>
              </td>

              <td className="px-4 py-3">
                <p className="text-ink-900">{order.customer.name}</p>
                <p className="truncate text-xs text-ink-500">
                  {order.customer.email}
                </p>
              </td>

              <td className="max-w-56 truncate px-4 py-3 text-ink-500">
                {order.lines
                  .map((l) => `${l.product.name} x${l.quantity}`)
                  .join(", ")}
              </td>

              <td className="px-4 py-3 text-ink-500">
                <DateRange from={order.rentalStart} to={order.rentalEnd} />
              </td>

              <td className="px-4 py-3 text-ink-500">
                {order.returnedAt ? formatDate(order.returnedAt) : "—"}
              </td>

              <td className="px-4 py-3 text-right tabular-nums">
                {Number(order.lateFeeTotal) > 0 ? (
                  <span className="font-medium text-red-600">
                    {formatCurrency(Number(order.lateFeeTotal))}
                  </span>
                ) : (
                  <span className="text-ink-400">—</span>
                )}
              </td>

              <td className="px-4 py-3 text-right font-medium tabular-nums text-ink-900">
                {formatCurrency(Number(order.total))}
              </td>

              <td className="px-4 py-3">
                <StatusBadge status={order.status as OrderStatus} />
              </td>
            </TableRow>
          ))}
        </DataTable>
      )}

      <Pagination
        meta={meta}
        basePath="/admin/completed"
        params={listParams}
        label="orders"
      />
    </div>
  );
}
