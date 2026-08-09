import type { Metadata } from "next";
import Link from "next/link";
import { ScrollText } from "lucide-react";

import { Card } from "@/components/ui/card";
import {
  CardGrid,
  DataTable,
  EmptyState,
  TableRow,
} from "@/components/ui/data-table";
import { DateRange } from "@/components/ui/date-range";
import { ListToolbar } from "@/components/ui/list-toolbar";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { StatusBadge } from "@/components/orders/status-badge";
import { ViewToggle } from "@/components/ui/view-toggle";
import { pageMeta, resolvePage } from "@/lib/pagination";
import {
  resolveEnumFilter,
  resolveSort,
  textSearch,
  type SortOption,
} from "@/lib/list-query";
import { resolveView } from "@/lib/view-mode";
import { requireRole } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { cn, formatCurrency } from "@/lib/utils";
import type { OrderStatus } from "@/types";
import type { Prisma } from "@prisma/client";

export const metadata: Metadata = { title: "Rental orders" };

// Finished rentals live in /admin/completed. This screen is the live queue,
// so a settled or cancelled order would only be noise here.
const CLOSED_STATUSES = ["COMPLETED", "CANCELLED"] as const;

const FILTERS = [
  { value: undefined, label: "All open" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "READY_FOR_PICKUP", label: "Ready" },
  { value: "PICKED_UP", label: "Picked up" },
  { value: "ACTIVE", label: "Active" },
  { value: "RETURN_DUE", label: "Return due" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "RETURNED", label: "Returned" },
];

const SORTS: SortOption<Prisma.RentalOrderOrderByWithRelationInput>[] = [
  { value: "newest", label: "Newest first", orderBy: { createdAt: "desc" } },
  { value: "oldest", label: "Oldest first", orderBy: { createdAt: "asc" } },
  { value: "due", label: "Return date (soonest)", orderBy: { rentalEnd: "asc" } },
  { value: "due-desc", label: "Return date (latest)", orderBy: { rentalEnd: "desc" } },
  { value: "value", label: "Highest value", orderBy: { total: "desc" } },
  { value: "value-asc", label: "Lowest value", orderBy: { total: "asc" } },
  { value: "number", label: "Order number", orderBy: { number: "asc" } },
];

const COLUMNS = [
  { key: "order", label: "Order" },
  { key: "customer", label: "Customer" },
  { key: "items", label: "Items" },
  { key: "period", label: "Rental period" },
  { key: "status", label: "Status" },
  { key: "rent", label: "Rent", align: "right" as const },
  { key: "deposit", label: "Deposit", align: "right" as const },
];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    view?: string;
    page?: string;
    q?: string;
    sort?: string;
    fulfilment?: string;
  }>;
}) {
  await requireRole("ADMIN");
  const {
    status,
    view: rawView,
    page,
    q,
    sort,
    fulfilment,
  } = await searchParams;
  const view = resolveView(rawView);
  const pageInfo = resolvePage(page);
  const activeSort = resolveSort(sort, SORTS);

  const search = textSearch(q, [
    "number",
    "customer.name",
    "customer.email",
    "lines.some.product.name",
  ]);

  const safeStatus = resolveEnumFilter(
    status,
    FILTERS.map((f) => f.value)
  );

  const where: Prisma.RentalOrderWhereInput = {
    ...(safeStatus
      ? { status: safeStatus as OrderStatus }
      : { status: { notIn: [...CLOSED_STATUSES] } }),
    ...(fulfilment === "delivery" ? { fulfilment: "DELIVERY" } : {}),
    ...(fulfilment === "pickup" ? { fulfilment: "STORE_PICKUP" } : {}),
    ...(search ? { OR: search } : {}),
  };

  const [orders, total] = await Promise.all([
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
  ]);

  const meta = pageMeta(pageInfo, total);
  const listParams = { view: rawView, q, sort, status, fulfilment };
  const filtered = Boolean(q || status || fulfilment);

  const itemsOf = (order: (typeof orders)[number]) =>
    order.lines.map((l) => `${l.product.name} x${l.quantity}`).join(", ");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rental orders"
        description={`${total} ${total === 1 ? "order" : "orders"}`}
        actions={<ViewToggle current={view} />}
      />

      <ListToolbar
        basePath="/admin/orders"
        params={listParams}
        searchPlaceholder="Search order no., customer or product…"
        sortOptions={SORTS.map(({ value, label }) => ({ value, label }))}
        filters={[
          { key: "status", label: "Status", options: FILTERS },
          {
            key: "fulfilment",
            label: "Fulfilment",
            options: [
              { value: undefined, label: "Any" },
              { value: "delivery", label: "Delivery" },
              { value: "pickup", label: "Store pickup" },
            ],
          },
        ]}
      />

      {orders.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title={filtered ? "No orders match" : "No orders yet"}
          description={
            filtered
              ? "Try a different status, search term or fulfilment filter."
              : "Orders appear here once a quotation is confirmed."
          }
        />
      ) : view === "cards" ? (
        <CardGrid>
          {orders.map((order) => (
            <Card
              key={order.id}
              hover
              className={cn(
                "flex flex-col p-5",
                order.status === "OVERDUE" && "ring-1 ring-red-200"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <Link
                  href={`/admin/orders/${order.id}`}
                  className="font-semibold text-brand-700 hover:text-brand-800"
                >
                  {order.number}
                </Link>
                <StatusBadge status={order.status as OrderStatus} />
              </div>

              <p className="mt-2 text-sm font-medium text-ink-900">
                {order.customer.name}
              </p>
              <p className="truncate text-xs text-ink-500">
                {order.customer.email}
              </p>

              <p className="mt-3 line-clamp-2 text-xs text-ink-500">
                {itemsOf(order)}
              </p>

              <DateRange
                from={order.rentalStart}
                to={order.rentalEnd}
                className="mt-2 text-xs text-ink-500"
              />

              <dl className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-3">
                <div>
                  <dt className="text-xs text-ink-500">Rent</dt>
                  <dd className="text-sm font-semibold text-ink-900">
                    {formatCurrency(Number(order.subtotal))}
                  </dd>
                </div>
                <div className="text-right">
                  <dt className="text-xs text-ink-500">Deposit</dt>
                  <dd className="text-sm font-semibold text-ink-900">
                    {formatCurrency(Number(order.depositTotal))}
                  </dd>
                </div>
              </dl>
            </Card>
          ))}
        </CardGrid>
      ) : (
        <DataTable columns={COLUMNS}>
          {orders.map((order) => (
            <TableRow
              key={order.id}
              className={cn(order.status === "OVERDUE" && "bg-red-50/60")}
            >
              <td className="px-4 py-3">
                <Link
                  href={`/admin/orders/${order.id}`}
                  className="font-medium text-brand-700 hover:text-brand-800"
                >
                  {order.number}
                </Link>
              </td>
              <td className="px-4 py-3 text-ink-700">{order.customer.name}</td>
              <td className="max-w-56 truncate px-4 py-3 text-ink-500">
                {itemsOf(order)}
              </td>
              <td className="px-4 py-3 text-ink-500">
                <DateRange from={order.rentalStart} to={order.rentalEnd} />
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={order.status as OrderStatus} />
              </td>
              <td className="px-4 py-3 text-right font-medium text-ink-900">
                {formatCurrency(Number(order.subtotal))}
              </td>
              <td className="px-4 py-3 text-right text-ink-700">
                {formatCurrency(Number(order.depositTotal))}
              </td>
            </TableRow>
          ))}
        </DataTable>
      )}

      <Pagination
        meta={meta}
        basePath="/admin/orders"
        params={listParams}
        label="orders"
      />
    </div>
  );
}
