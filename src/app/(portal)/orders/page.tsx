import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, PackageSearch } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { requireUser } from "@/lib/auth/current-user";
import { listOrdersForCustomer } from "@/server/services/orders";
import { formatCurrency } from "@/lib/utils";
import type { OrderStatus } from "@/types";

export const metadata: Metadata = { title: "My rentals" };

const COLUMNS = [
  { key: "order", label: "Order" },
  { key: "items", label: "Items" },
  { key: "period", label: "Rental period" },
  { key: "status", label: "Status" },
  { key: "total", label: "Total", align: "right" as const },
];

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const user = await requireUser();
  const view = resolveView((await searchParams).view);
  const orders = await listOrdersForCustomer(user.id);

  const itemsOf = (o: (typeof orders)[number]) =>
    o.lines.map((l) => `${l.product.name} x${l.quantity}`).join(", ");

  return (
    <div className="space-y-6">
      <PageHeader
        title="My rentals"
        description={`${orders.length} ${orders.length === 1 ? "rental" : "rentals"}`}
        actions={orders.length > 0 ? <ViewToggle current={view} /> : undefined}
      />

      {orders.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title="You have no rentals yet"
          description="Browse the catalogue and book your first rental."
          action={
            <Link href="/products">
              <Button>
                Browse rentals
                <ArrowRight className="size-4" aria-hidden />
              </Button>
            </Link>
          }
        />
      ) : view === "cards" ? (
        <CardGrid>
          {orders.map((order) => (
            <Card key={order.id} hover className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <Link
                  href={`/orders/${order.id}`}
                  className="font-semibold text-brand-700 hover:text-brand-800"
                >
                  {order.number}
                </Link>
                <StatusBadge status={order.status as OrderStatus} />
              </div>

              <p className="mt-2 line-clamp-2 text-sm text-ink-700">
                {itemsOf(order)}
              </p>

              <DateRange
                from={order.rentalStart}
                to={order.rentalEnd}
                className="mt-2 text-xs text-ink-500"
              />

              <div className="mt-4 flex items-end justify-between border-t border-line pt-3">
                <div>
                  <p className="text-xs text-ink-500">Total paid</p>
                  <p className="text-lg font-semibold text-ink-900">
                    {formatCurrency(Number(order.total))}
                  </p>
                  <p className="text-xs text-ink-500">
                    incl. {formatCurrency(Number(order.depositTotal))} deposit
                  </p>
                  {Number(order.lateFeeTotal) > 0 && (
                    <p className="text-xs font-medium text-red-600">
                      {formatCurrency(Number(order.lateFeeTotal))} late fee
                    </p>
                  )}
                </div>

                <Link href={`/orders/${order.id}`}>
                  <Button variant="soft" size="sm">
                    Details
                    <ArrowRight className="size-4" aria-hidden />
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </CardGrid>
      ) : (
        <DataTable columns={COLUMNS} minWidth="44rem">
          {orders.map((order) => (
            <TableRow key={order.id}>
              <td className="px-4 py-3">
                <Link
                  href={`/orders/${order.id}`}
                  className="font-medium text-brand-700 hover:text-brand-800"
                >
                  {order.number}
                </Link>
              </td>
              <td className="max-w-64 truncate px-4 py-3 text-ink-700">
                {itemsOf(order)}
              </td>
              <td className="px-4 py-3 text-ink-500">
                <DateRange from={order.rentalStart} to={order.rentalEnd} />
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={order.status as OrderStatus} />
              </td>
              <td className="px-4 py-3 text-right">
                <p className="font-medium text-ink-900">
                  {formatCurrency(Number(order.total))}
                </p>
                <p className="text-xs text-ink-500">
                  incl. {formatCurrency(Number(order.depositTotal))} deposit
                </p>
              </td>
            </TableRow>
          ))}
        </DataTable>
      )}
    </div>
  );
}
