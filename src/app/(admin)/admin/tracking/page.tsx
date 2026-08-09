import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Radar } from "lucide-react";

import { Card } from "@/components/ui/card";
import { CardGrid, EmptyState } from "@/components/ui/data-table";
import { DateRange } from "@/components/ui/date-range";
import { ListToolbar } from "@/components/ui/list-toolbar";
import { OrderTrack } from "@/components/orders/order-track";
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
import { formatCurrency } from "@/lib/utils";
import type { OrderStatus } from "@/types";

export const metadata: Metadata = { title: "Order tracking" };

const SORTS: SortOption<Prisma.RentalOrderOrderByWithRelationInput>[] = [
  { value: "due", label: "Return date (soonest)", orderBy: { rentalEnd: "asc" } },
  { value: "newest", label: "Newest first", orderBy: { createdAt: "desc" } },
  { value: "oldest", label: "Oldest first", orderBy: { createdAt: "asc" } },
  { value: "customer", label: "Customer A–Z", orderBy: { customer: { name: "asc" } } },
];

const STAGE_FILTERS = [
  { value: undefined, label: "In flight" },
  { value: "awaiting", label: "Awaiting pickup" },
  { value: "out", label: "With customer" },
  { value: "overdue", label: "Overdue" },
  { value: "closed", label: "Closed" },
];

export default async function AdminTrackingPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    sort?: string;
    stage?: string;
  }>;
}) {
  await requireRole("ADMIN");
  const { page, q, sort, stage } = await searchParams;
  const pageInfo = resolvePage(page, 12);
  const activeSort = resolveSort(sort, SORTS);
  const now = new Date();

  const safeStage = resolveEnumFilter(
    stage,
    STAGE_FILTERS.map((f) => f.value)
  );

  const search = textSearch(q, [
    "number",
    "customer.name",
    "customer.email",
    "lines.some.product.name",
  ]);

  const stageWhere: Prisma.RentalOrderWhereInput =
    safeStage === "awaiting"
      ? { status: { in: ["CONFIRMED", "READY_FOR_PICKUP"] } }
      : safeStage === "out"
        ? { status: { in: ["PICKED_UP", "ACTIVE", "RETURN_DUE"] } }
        : safeStage === "overdue"
          ? { returnedAt: null, rentalEnd: { lt: now }, status: { notIn: ["COMPLETED", "CANCELLED"] } }
          : safeStage === "closed"
            ? { status: { in: ["RETURNED", "COMPLETED", "CANCELLED"] } }
            : // Default view is the work in progress — the whole point of a
              // tracking board is what is still moving.
              { status: { notIn: ["COMPLETED", "CANCELLED"] } };

  const where: Prisma.RentalOrderWhereInput = {
    ...stageWhere,
    ...(search ? { OR: search } : {}),
  };

  const [orders, total] = await Promise.all([
    prisma.rentalOrder.findMany({
      where,
      orderBy: activeSort.orderBy,
      skip: pageInfo.skip,
      take: pageInfo.take,
      include: {
        customer: { select: { name: true, phone: true } },
        lines: { include: { product: { select: { name: true } } } },
        pickup: { select: { confirmedAt: true, scheduledFor: true } },
        return: { select: { receivedAt: true, scheduledFor: true } },
      },
    }),
    prisma.rentalOrder.count({ where }),
  ]);

  const meta = pageMeta(pageInfo, total);
  const listParams = { q, sort, stage };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Order tracking"
        description={`${total} rental${total === 1 ? "" : "s"} on the board. Every stage from booking to settlement, for every customer.`}
      />

      <ListToolbar
        basePath="/admin/tracking"
        params={listParams}
        searchPlaceholder="Search order no., customer or product…"
        sortOptions={SORTS.map(({ value, label }) => ({ value, label }))}
        filters={[{ key: "stage", options: STAGE_FILTERS }]}
      />

      {orders.length === 0 ? (
        <EmptyState
          icon={Radar}
          title={q || stage ? "Nothing matches" : "Nothing in flight"}
          description={
            q || stage
              ? "Try a different search term or stage."
              : "Every rental has been settled. New bookings appear here as they are confirmed."
          }
        />
      ) : (
        <CardGrid className="xl:grid-cols-2">
          {orders.map((order) => (
            <Card key={order.id} className="flex flex-col p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="font-semibold text-brand-700 hover:text-brand-800"
                  >
                    {order.number}
                  </Link>
                  <p className="mt-0.5 truncate text-sm text-ink-700">
                    {order.customer.name}
                    {order.customer.phone && (
                      <span className="text-ink-500"> · {order.customer.phone}</span>
                    )}
                  </p>
                  <p className="truncate text-xs text-ink-500">
                    {order.lines
                      .map((l) => `${l.product.name} x${l.quantity}`)
                      .join(", ")}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <StatusBadge status={order.status as OrderStatus} />
                  <p className="mt-1 text-sm font-medium tabular-nums text-ink-900">
                    {formatCurrency(Number(order.total))}
                  </p>
                </div>
              </div>

              <DateRange
                from={order.rentalStart}
                to={order.rentalEnd}
                className="mt-2 text-xs text-ink-500"
              />

              <div className="mt-4 border-t border-line pt-4">
                <OrderTrack order={order} />
              </div>
            </Card>
          ))}
        </CardGrid>
      )}

      <Pagination
        meta={meta}
        basePath="/admin/tracking"
        params={listParams}
        label="rentals"
      />
    </div>
  );
}
