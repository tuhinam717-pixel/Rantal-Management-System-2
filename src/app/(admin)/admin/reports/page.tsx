import type { Metadata } from "next";
import {
  AlertTriangle,
  Boxes,
  CircleDollarSign,
  Percent,
  TrendingUp,
} from "lucide-react";

import { requireRole } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { cn, formatCurrency } from "@/lib/utils";

export const metadata: Metadata = { title: "Reports" };

/** Twelve-month revenue trend, top earners, and how hard stock is working. */
export default async function AdminReportsPage() {
  await requireRole("ADMIN");

  const now = new Date();
  const yearAgo = new Date(now);
  yearAgo.setMonth(yearAgo.getMonth() - 11);
  yearAgo.setDate(1);
  yearAgo.setHours(0, 0, 0, 0);

  const [payments, lines, products, orders, lateFees] = await Promise.all([
    prisma.payment.findMany({
      where: { status: "PAID", purpose: "RENTAL", paidAt: { gte: yearAgo } },
      select: { amount: true, paidAt: true },
    }),
    prisma.rentalOrderLine.findMany({
      select: {
        quantity: true,
        lineTotal: true,
        product: { select: { id: true, name: true } },
      },
    }),
    prisma.product.findMany({
      where: { isRentable: true },
      select: { id: true, name: true, totalStock: true, reservedStock: true },
    }),
    prisma.rentalOrder.findMany({
      select: { status: true, total: true, returnedAt: true, rentalEnd: true },
    }),
    prisma.lateFee.aggregate({ _sum: { amount: true }, _count: true }),
  ]);

  // ---- monthly revenue ---------------------------------------------------
  const months: { key: string; label: string; total: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(yearAgo);
    d.setMonth(d.getMonth() + i);
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleDateString("en-IN", { month: "short" }),
      total: 0,
    });
  }
  const monthIndex = new Map(months.map((m, i) => [m.key, i]));
  for (const payment of payments) {
    if (!payment.paidAt) continue;
    const key = `${payment.paidAt.getFullYear()}-${payment.paidAt.getMonth()}`;
    const idx = monthIndex.get(key);
    if (idx !== undefined) months[idx].total += Number(payment.amount);
  }
  const peak = Math.max(1, ...months.map((m) => m.total));
  const totalRevenue = months.reduce((sum, m) => sum + m.total, 0);

  // ---- top products ------------------------------------------------------
  const byProduct = new Map<string, { name: string; revenue: number; units: number }>();
  for (const line of lines) {
    const entry = byProduct.get(line.product.id) ?? {
      name: line.product.name,
      revenue: 0,
      units: 0,
    };
    entry.revenue += Number(line.lineTotal);
    entry.units += line.quantity;
    byProduct.set(line.product.id, entry);
  }
  const topProducts = [...byProduct.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  // ---- utilisation -------------------------------------------------------
  const utilisation = products
    .map((p) => ({
      name: p.name,
      out: p.reservedStock,
      total: p.totalStock,
      pct: p.totalStock > 0 ? (p.reservedStock / p.totalStock) * 100 : 0,
    }))
    .filter((p) => p.total > 0)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 8);

  // ---- reliability -------------------------------------------------------
  const returned = orders.filter((o) => o.returnedAt !== null);
  const onTime = returned.filter((o) => o.returnedAt! <= o.rentalEnd).length;
  const onTimeRate = returned.length > 0 ? (onTime / returned.length) * 100 : 0;
  const avgOrderValue =
    orders.length > 0
      ? orders.reduce((sum, o) => sum + Number(o.total), 0) / orders.length
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          Reports
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Rental revenue, what earns most, and how hard the stock is working.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          icon={TrendingUp}
          label="Revenue (12 months)"
          value={formatCurrency(totalRevenue)}
        />
        <Stat
          icon={CircleDollarSign}
          label="Average order value"
          value={formatCurrency(avgOrderValue)}
        />
        <Stat
          icon={Percent}
          label="Returned on time"
          value={`${onTimeRate.toFixed(0)}%`}
          tone={onTimeRate >= 80 ? "good" : "warn"}
        />
        <Stat
          icon={AlertTriangle}
          label="Late fees charged"
          value={formatCurrency(Number(lateFees._sum.amount ?? 0))}
          hint={`${lateFees._count} charge${lateFees._count === 1 ? "" : "s"}`}
        />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-ink-900">
          Monthly rental revenue
        </h2>

        {/* Simple CSS bar chart — no charting dependency needed for 12 bars. */}
        <div className="mt-5 flex h-48 items-end gap-2">
          {months.map((month) => (
            <div key={month.key} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <div className="flex w-full flex-1 items-end">
                <div
                  className="w-full rounded-t bg-brand-500 transition-all"
                  style={{ height: `${Math.max(2, (month.total / peak) * 100)}%` }}
                  title={`${month.label}: ${formatCurrency(month.total)}`}
                />
              </div>
              <span className="text-xs text-ink-500">{month.label}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-ink-900">
            <TrendingUp className="size-4 text-brand-600" aria-hidden />
            Top earning products
          </h2>

          {topProducts.length === 0 ? (
            <p className="mt-3 text-sm text-ink-500">No rentals recorded yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {topProducts.map((product) => (
                <li key={product.name}>
                  <div className="flex items-baseline justify-between gap-4 text-sm">
                    <span className="truncate text-ink-900">{product.name}</span>
                    <span className="shrink-0 font-medium text-ink-900">
                      {formatCurrency(product.revenue)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-brand-500"
                        style={{
                          width: `${(product.revenue / topProducts[0].revenue) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="shrink-0 text-xs text-ink-500">
                      {product.units} units
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-ink-900">
            <Boxes className="size-4 text-brand-600" aria-hidden />
            Stock utilisation
          </h2>
          <p className="mt-1 text-xs text-ink-500">
            Share of each product currently out on rental.
          </p>

          <ul className="mt-4 space-y-3">
            {utilisation.map((item) => (
              <li key={item.name}>
                <div className="flex items-baseline justify-between gap-4 text-sm">
                  <span className="truncate text-ink-900">{item.name}</span>
                  <span className="shrink-0 text-ink-500">
                    {item.out} / {item.total}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      item.pct >= 80
                        ? "bg-red-500"
                        : item.pct >= 40
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                    )}
                    style={{ width: `${Math.min(100, item.pct)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "good" | "warn";
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-ink-500">{label}</p>
        <span
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-lg",
            tone === "good"
              ? "bg-emerald-50 text-emerald-700"
              : tone === "warn"
                ? "bg-amber-50 text-amber-700"
                : "bg-slate-100 text-ink-700"
          )}
        >
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-2 text-xl font-semibold tabular-nums text-ink-900">
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-ink-500">{hint}</p>}
    </div>
  );
}
