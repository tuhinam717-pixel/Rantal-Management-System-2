import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  PackageCheck,
  PackageSearch,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/data-table";
import { DateRange } from "@/components/ui/date-range";
import { KpiTile } from "@/components/dashboard/kpi-tile";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/orders/status-badge";
import { requireUser } from "@/lib/auth/current-user";
import { getCustomerDashboard } from "@/server/services/dashboard";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { OrderStatus } from "@/types";

export const metadata: Metadata = { title: "Dashboard" };

/** Days until a return is due; negative once it is late. */
function daysUntil(date: Date, now: Date) {
  const day = 24 * 60 * 60 * 1000;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const due = new Date(date);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - start.getTime()) / day);
}

function dueLabel(days: number) {
  if (days < 0) return `${Math.abs(days)} day${days === -1 ? "" : "s"} overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}

export default async function PortalDashboardPage() {
  const user = await requireUser();
  const now = new Date();
  const data = await getCustomerDashboard(user.id, now);

  const itemsOf = (order: { lines: { product: { name: string }; quantity: number }[] }) =>
    order.lines.map((l) => `${l.product.name} x${l.quantity}`).join(", ");

  const hasAnyRental = data.recent.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Hi ${user.name.split(" ")[0]}`}
        description="Your rentals, returns and deposits at a glance."
        actions={
          <Link href="/products">
            <Button>
              Browse rentals
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          </Link>
        }
      />

      {!hasAnyRental ? (
        <EmptyState
          icon={PackageSearch}
          title="You have no rentals yet"
          description="Browse the catalogue, pick a rental period and book your first product."
          action={
            <Link href="/products">
              <Button>
                Browse rentals
                <ArrowRight className="size-4" aria-hidden />
              </Button>
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiTile
              label="Active rentals"
              value={data.activeRentals}
              icon={PackageCheck}
            />
            <KpiTile
              label="Returning this week"
              value={data.returningSoon}
              icon={CalendarClock}
              tone="warning"
            />
            <KpiTile
              label="Overdue"
              value={data.overdueRentals}
              icon={AlertTriangle}
              tone={data.overdueRentals > 0 ? "danger" : "default"}
            />
            <KpiTile
              label="Deposits held"
              value={data.depositsHeld}
              icon={ShieldCheck}
              currency
            />
          </div>

          {data.overdueRentals > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-800">
                <span className="font-semibold">
                  {data.overdueRentals} rental
                  {data.overdueRentals === 1 ? " is" : "s are"} overdue.
                </span>{" "}
                A late fee accrues daily and is deducted from your deposit.
              </p>
              <Link href="/orders?status=overdue">
                <Button variant="soft" size="sm">
                  View overdue
                  <ArrowRight className="size-4" aria-hidden />
                </Button>
              </Link>
            </div>
          )}

          <div className="grid gap-5 lg:grid-cols-2">
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-ink-900">
                  Returns coming up
                </h2>
                <Link
                  href="/orders?status=active"
                  className="text-sm font-medium text-brand-700 hover:text-brand-800"
                >
                  All active
                </Link>
              </div>

              {data.upcoming.length === 0 ? (
                <p className="mt-3 text-sm text-ink-500">
                  Nothing to return right now.
                </p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {data.upcoming.map((order) => {
                    const days = daysUntil(order.rentalEnd, now);
                    return (
                      <li
                        key={order.id}
                        className="flex items-start justify-between gap-3 border-b border-line pb-3 last:border-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          <Link
                            href={`/orders/${order.id}`}
                            className="text-sm font-medium text-brand-700 hover:text-brand-800"
                          >
                            {order.number}
                          </Link>
                          <p className="truncate text-xs text-ink-500">
                            {itemsOf(order)}
                          </p>
                          <p className="text-xs text-ink-500">
                            Return by {formatDate(order.rentalEnd)}
                          </p>
                        </div>
                        <span
                          className={
                            days < 0
                              ? "shrink-0 text-xs font-semibold text-red-600"
                              : days <= 1
                                ? "shrink-0 text-xs font-semibold text-amber-700"
                                : "shrink-0 text-xs text-ink-500"
                          }
                        >
                          {dueLabel(days)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-ink-900">
                  Recent rentals
                </h2>
                <Link
                  href="/orders"
                  className="text-sm font-medium text-brand-700 hover:text-brand-800"
                >
                  View all
                </Link>
              </div>

              <ul className="mt-3 space-y-3">
                {data.recent.map((order) => (
                  <li
                    key={order.id}
                    className="flex items-start justify-between gap-3 border-b border-line pb-3 last:border-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/orders/${order.id}`}
                        className="text-sm font-medium text-brand-700 hover:text-brand-800"
                      >
                        {order.number}
                      </Link>
                      <p className="truncate text-xs text-ink-500">
                        {itemsOf(order)}
                      </p>
                      <DateRange
                        from={order.rentalStart}
                        to={order.rentalEnd}
                        className="text-xs text-ink-500"
                      />
                    </div>
                    <div className="shrink-0 text-right">
                      <StatusBadge status={order.status as OrderStatus} />
                      <p className="mt-1 text-sm font-medium text-ink-900">
                        {formatCurrency(Number(order.total))}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <p className="text-sm font-medium text-ink-900">
                Total spent on rentals
              </p>
              <p className="text-xs text-ink-500">
                Excludes refundable security deposits.
              </p>
            </div>
            <p className="text-xl font-semibold tabular-nums text-ink-900">
              {formatCurrency(data.totalSpent)}
            </p>
          </Card>
        </>
      )}
    </div>
  );
}
