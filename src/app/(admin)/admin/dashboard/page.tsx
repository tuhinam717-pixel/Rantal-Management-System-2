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

import { KpiTile } from "@/components/dashboard/kpi-tile";
import { requireRole } from "@/lib/auth/current-user";
import {
  getDashboardKpis,
  getDashboardQueues,
} from "@/server/services/dashboard";
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Operations dashboard" };

export default async function AdminDashboardPage() {
  await requireRole("ADMIN");

  const [kpis, queues] = await Promise.all([
    getDashboardKpis(),
    getDashboardQueues(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          Rental operations
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Live view of what needs attention today.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Active rentals" value={kpis.activeRentals} icon={PackageCheck} />
        <KpiTile label="Rentals due today" value={kpis.dueToday} icon={CalendarClock} tone="warning" />
        <KpiTile label="Upcoming pickups" value={kpis.upcomingPickups} icon={Truck} />
        <KpiTile label="Upcoming returns" value={kpis.upcomingReturns} icon={Undo2} />
        <KpiTile label="Overdue rentals" value={kpis.overdueRentals} icon={AlertTriangle} tone="danger" />
        <KpiTile label="Revenue from rentals" value={kpis.rentalRevenue} icon={ReceiptIndianRupee} tone="success" currency />
        <KpiTile label="Security deposits held" value={kpis.depositsHeld} icon={ShieldCheck} currency />
        <KpiTile label="Late fees collected" value={kpis.lateFeesCollected} icon={Coins} currency />
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
