import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, Gauge, PackageSearch, Wrench } from "lucide-react";

import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { DataTable, EmptyState, TableRow } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/lib/auth/current-user";
import {
  getAvailabilityForecast,
  getMaintenanceSuggestions,
} from "@/server/services/insights";
import { cn, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Insights" };

const URGENCY: Record<string, { tone: BadgeTone; label: string }> = {
  due: { tone: "danger", label: "Service due" },
  soon: { tone: "warning", label: "Service soon" },
  ok: { tone: "success", label: "Healthy" },
};

const MAINTENANCE_COLUMNS = [
  { key: "product", label: "Product" },
  { key: "why", label: "Why" },
  { key: "rentals", label: "Rentals", align: "right" as const },
  { key: "days", label: "Days on hire", align: "right" as const },
  { key: "serviced", label: "Last serviced" },
  { key: "score", label: "Wear", align: "right" as const },
];

const FORECAST_COLUMNS = [
  { key: "product", label: "Product" },
  { key: "available", label: "Free now", align: "right" as const },
  { key: "out", label: "On rental", align: "right" as const },
  { key: "repair", label: "In repair", align: "right" as const },
  { key: "next", label: "Next free" },
  { key: "upcoming", label: "Booked (14d)", align: "right" as const },
];

export default async function AdminInsightsPage() {
  await requireRole("ADMIN");

  const [maintenance, forecast] = await Promise.all([
    getMaintenanceSuggestions(),
    getAvailabilityForecast(),
  ]);

  const dueCount = maintenance.filter((m) => m.urgency === "due").length;
  const stockedOut = forecast.filter((f) => f.availableNow === 0).length;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Insights"
        description="Derived from rental history — no extra tracking, no hardware."
      />

      <section className="space-y-4">
        <Card>
          <CardHeader
            title={
              <span className="inline-flex items-center gap-2">
                <Wrench className="size-4 text-brand-700" aria-hidden />
                Predictive maintenance
              </span>
            }
            description={
              maintenance.length === 0
                ? "Not enough rental history yet."
                : `${dueCount} product${dueCount === 1 ? "" : "s"} due for service. Ranked by rentals since last service, days on hire and damaged returns.`
            }
          />
        </Card>

        {maintenance.length === 0 ? (
          <EmptyState
            icon={Gauge}
            title="Nothing to service yet"
            description="Suggestions appear once products have been out on rental."
          />
        ) : (
          <DataTable columns={MAINTENANCE_COLUMNS} minWidth="64rem">
            {maintenance.map((item) => {
              const urgency = URGENCY[item.urgency];

              return (
                <TableRow key={item.productId}>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/products/${item.productId}`}
                      className="font-medium text-brand-700 hover:text-brand-800"
                    >
                      {item.name}
                    </Link>
                    <p className="font-mono text-xs text-ink-500">{item.sku}</p>
                  </td>
                  <td className="max-w-72 px-4 py-3">
                    <ul className="space-y-0.5 text-xs text-ink-700">
                      {item.reasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-900">
                    {item.rentalsSinceService}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-700">
                    {item.daysOnHire}
                  </td>
                  <td className="px-4 py-3 text-ink-500">
                    {item.lastServicedAt
                      ? formatDate(item.lastServicedAt)
                      : "Never"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-canvas">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            item.urgency === "due"
                              ? "bg-red-500"
                              : item.urgency === "soon"
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                          )}
                          style={{ width: `${item.score}%` }}
                        />
                      </div>
                      <Badge tone={urgency.tone}>{urgency.label}</Badge>
                    </div>
                  </td>
                </TableRow>
              );
            })}
          </DataTable>
        )}
      </section>

      <section className="space-y-4">
        <Card>
          <CardHeader
            title={
              <span className="inline-flex items-center gap-2">
                <CalendarClock className="size-4 text-brand-700" aria-hidden />
                Availability forecast
              </span>
            }
            description={
              forecast.length === 0
                ? "Everything is in stock and nothing is booked ahead."
                : `${stockedOut} product${stockedOut === 1 ? "" : "s"} fully booked. Answers "when can I have one?" at the counter.`
            }
          />
        </Card>

        {forecast.length === 0 ? (
          <EmptyState
            icon={PackageSearch}
            title="Nothing constrained"
            description="Every product has stock free and no bookings in the next fortnight."
          />
        ) : (
          <DataTable columns={FORECAST_COLUMNS} minWidth="60rem">
            {forecast.map((item) => (
              <TableRow
                key={item.productId}
                className={cn(item.availableNow === 0 && "bg-amber-50/50")}
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/products/${item.productId}`}
                    className="font-medium text-brand-700 hover:text-brand-800"
                  >
                    {item.name}
                  </Link>
                  <p className="font-mono text-xs text-ink-500">{item.sku}</p>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  <span
                    className={cn(
                      "font-semibold",
                      item.availableNow === 0 ? "text-red-600" : "text-ink-900"
                    )}
                  >
                    {item.availableNow}
                  </span>
                  <span className="text-ink-500"> / {item.totalStock}</span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-ink-700">
                  {item.outOnRental}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {item.underRepair > 0 ? (
                    <span className="text-amber-700">{item.underRepair}</span>
                  ) : (
                    <span className="text-ink-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-ink-700">
                  {item.availableNow > 0 ? (
                    <Badge tone="success">Available now</Badge>
                  ) : item.nextFreeAt ? (
                    formatDate(item.nextFreeAt)
                  ) : (
                    <span className="text-ink-400">Unknown</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-ink-700">
                  {item.upcomingBookings}
                </td>
              </TableRow>
            ))}
          </DataTable>
        )}
      </section>
    </div>
  );
}
