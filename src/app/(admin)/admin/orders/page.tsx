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
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/orders/status-badge";
import { ViewToggle } from "@/components/ui/view-toggle";
import { resolveView } from "@/lib/view-mode";
import { requireRole } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { cn, formatCurrency } from "@/lib/utils";
import type { OrderStatus } from "@/types";

export const metadata: Metadata = { title: "Rental orders" };

const FILTERS = [
  { key: undefined, label: "All" },
  { key: "ACTIVE", label: "Active" },
  { key: "OVERDUE", label: "Overdue" },
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "COMPLETED", label: "Completed" },
] as const;

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
  searchParams: Promise<{ status?: string; view?: string }>;
}) {
  await requireRole("ADMIN");
  const { status, view: rawView } = await searchParams;
  const view = resolveView(rawView);

  const orders = await prisma.rentalOrder.findMany({
    where: status ? { status: status as OrderStatus } : {},
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { name: true, email: true } },
      lines: { include: { product: { select: { name: true } } } },
    },
  });

  /** Keeps the current view when switching status filters. */
  const filterHref = (key?: string) => {
    const params = new URLSearchParams();
    if (key) params.set("status", key);
    if (view === "cards") params.set("view", "cards");
    const q = params.toString();
    return q ? `/admin/orders?${q}` : "/admin/orders";
  };

  const itemsOf = (order: (typeof orders)[number]) =>
    order.lines.map((l) => `${l.product.name} x${l.quantity}`).join(", ");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rental orders"
        description={`${orders.length} ${orders.length === 1 ? "order" : "orders"}`}
        actions={<ViewToggle current={view} />}
      />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <Link
            key={filter.label}
            href={filterHref(filter.key)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
              status === filter.key
                ? "bg-brand-600 text-white shadow-card"
                : "bg-surface text-ink-700 ring-1 ring-inset ring-line hover:bg-brand-50 hover:ring-brand-300"
            )}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="No orders match this filter"
          description="Try a different status, or create one from a quotation."
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
    </div>
  );
}
