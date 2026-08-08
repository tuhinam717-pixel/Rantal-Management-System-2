import type { Metadata } from "next";
import {
  AlertTriangle,
  CalendarClock,
  Coins,
  PackageCheck,
  ReceiptIndianRupee,
  ShieldCheck,
  Truck,
  Undo2,
} from "lucide-react";

import { CustomizeWidgets } from "@/components/dashboard/customize-widgets";
import { KpiTile } from "@/components/dashboard/kpi-tile";
import { PageHeader } from "@/components/ui/page-header";
import { resolveWidgets } from "@/lib/dashboard-widgets";
import { requireRole } from "@/lib/auth/current-user";
import {
  getDashboardKpis,
  getDashboardQueues,
} from "@/server/services/dashboard";
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Operations dashboard" };

/** Presentation for each tile, keyed the same way the stored preference is. */
const TILES = {
  activeRentals: { label: "Active rentals", icon: PackageCheck },
  dueToday: { label: "Rentals due today", icon: CalendarClock, tone: "warning" },
  upcomingPickups: { label: "Upcoming pickups", icon: Truck },
  upcomingReturns: { label: "Upcoming returns", icon: Undo2 },
  overdueRentals: { label: "Overdue rentals", icon: AlertTriangle, tone: "danger" },
  rentalRevenue: { label: "Revenue from rentals", icon: ReceiptIndianRupee, tone: "success", currency: true },
  depositsHeld: { label: "Security deposits held", icon: ShieldCheck, currency: true },
  lateFeesCollected: { label: "Late fees collected", icon: Coins, currency: true },
} as const;

export default async function AdminDashboardPage() {
  const user = await requireRole("ADMIN");

  const [kpis, queues] = await Promise.all([
    getDashboardKpis(),
    getDashboardQueues(),
  ]);

  const widgets = resolveWidgets(user.dashboardWidgets);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rental operations"
        description="Live view of what needs attention today."
        actions={<CustomizeWidgets current={widgets} />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {widgets.map((key) => {
          const tile = TILES[key];
          return (
            <KpiTile
              key={key}
              label={tile.label}
              value={kpis[key]}
              icon={tile.icon}
              tone={"tone" in tile ? tile.tone : undefined}
              currency={"currency" in tile ? tile.currency : undefined}
            />
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-ink-900">
            Overdue — needs chasing
          </h2>
          {queues.overdue.length === 0 ? (
            <p className="mt-3 text-sm text-ink-500">Nothing overdue. </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {queues.overdue.map((order) => (
                <li key={order.id} className="text-sm">
                  <p className="font-medium text-ink-900">{order.number}</p>
                  <p className="text-xs text-ink-500">
                    {order.customer.name} · due {formatDate(order.rentalEnd)}
                  </p>
                  <p className="text-xs font-medium text-red-600">
                    {formatCurrency(Number(order.depositTotal))} deposit held
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-ink-900">
            Today&apos;s pickups
          </h2>
          {queues.pickupsToday.length === 0 ? (
            <p className="mt-3 text-sm text-ink-500">No pickups scheduled.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {queues.pickupsToday.map((pickup) => (
                <li key={pickup.id} className="text-sm">
                  <p className="font-medium text-ink-900">
                    {pickup.order.number}
                  </p>
                  <p className="text-xs text-ink-500">
                    {pickup.order.customer.name} · {pickup.status.toLowerCase()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-ink-900">
            Today&apos;s returns
          </h2>
          {queues.returnsToday.length === 0 ? (
            <p className="mt-3 text-sm text-ink-500">No returns scheduled.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {queues.returnsToday.map((ret) => (
                <li key={ret.id} className="text-sm">
                  <p className="font-medium text-ink-900">{ret.order.number}</p>
                  <p className="text-xs text-ink-500">
                    {ret.order.customer.name} · {ret.status.toLowerCase()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
