import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, Route, Truck, User } from "lucide-react";

import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  CardGrid,
  DataTable,
  EmptyState,
  TableRow,
} from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { ViewToggle } from "@/components/ui/view-toggle";
import { PickupChecklist } from "@/components/pickup-return/pickup-checklist";
import {
  RoutePlanner,
  type RouteStop,
} from "@/components/pickup-return/route-planner";
import { parseChecklist } from "@/lib/rental/pickup-checklist";
import { requireRole } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { pageMeta, resolvePage } from "@/lib/pagination";
import { resolveView } from "@/lib/view-mode";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Pickups" };

const STATUS_TONE: Record<string, BadgeTone> = {
  SCHEDULED: "brand",
  IN_TRANSIT: "warning",
  COMPLETED: "success",
  MISSED: "danger",
};

const COLUMNS = [
  { key: "order", label: "Order" },
  { key: "customer", label: "Customer" },
  { key: "address", label: "Where" },
  { key: "scheduled", label: "Scheduled" },
  { key: "stop", label: "Stop", align: "right" as const },
  { key: "status", label: "Status" },
  { key: "actions", label: "", align: "right" as const },
];

export default async function AdminPickupsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; page?: string; day?: string }>;
}) {
  await requireRole("ADMIN");
  const { view: rawView, page, day: rawDay } = await searchParams;
  const view = resolveView(rawView);
  const pageInfo = resolvePage(page);

  // Route planning is per day; default to today.
  const day = /^\d{4}-\d{2}-\d{2}$/.test(rawDay ?? "")
    ? rawDay!
    : new Date().toLocaleDateString("en-CA");
  const dayStart = new Date(`${day}T00:00:00`);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const where = { status: { not: "COMPLETED" as const } };

  const [pickups, total, done, routeRows] = await Promise.all([
    prisma.pickup.findMany({
      where,
      orderBy: [{ scheduledFor: "asc" }, { routeSequence: "asc" }],
      skip: pageInfo.skip,
      take: pageInfo.take,
      include: {
        order: {
          include: {
            customer: { select: { name: true, phone: true } },
            shippingAddress: true,
            lines: { include: { product: { select: { name: true } } } },
          },
        },
      },
    }),
    prisma.pickup.count({ where }),
    prisma.pickup.count({ where: { status: "COMPLETED" } }),
    prisma.pickup.findMany({
      where: { ...where, scheduledFor: { gte: dayStart, lt: dayEnd } },
      orderBy: [{ routeSequence: "asc" }, { scheduledFor: "asc" }],
      include: {
        order: {
          include: {
            customer: { select: { name: true } },
            shippingAddress: true,
          },
        },
      },
    }),
  ]);

  const meta = pageMeta(pageInfo, total);

  const addressOf = (a: { line1: string; city: string; postalCode: string } | null) =>
    a ? `${a.line1}, ${a.city} ${a.postalCode}` : "Collection from store";

  const placeOf = (p: (typeof pickups)[number]) =>
    addressOf(p.order.shippingAddress);

  const stops: RouteStop[] = routeRows.map((r) => ({
    id: r.id,
    orderId: r.orderId,
    orderNumber: r.order.number,
    customerName: r.order.customer.name,
    place: addressOf(r.order.shippingAddress),
    scheduledFor: r.scheduledFor,
    routeSequence: r.routeSequence,
    assignedTo: r.assignedTo,
    checklist: r.checklist,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pickup schedule"
        description={`${total} pending · ${done} completed · ordered by route sequence`}
        actions={
          <>
            {/* GET form so picking a day is a plain, shareable URL. */}
            <form action="/admin/pickups" className="flex items-center gap-2">
              {view === "cards" && (
                <input type="hidden" name="view" value="cards" />
              )}
              <input
                type="date"
                name="day"
                defaultValue={day}
                aria-label="Route day"
                className="rounded-xl border-0 bg-surface py-2 pl-3 pr-2 text-sm text-ink-900 shadow-sm ring-1 ring-inset ring-line focus:ring-2 focus:ring-inset focus:ring-brand-600 focus:outline-none"
              />
              <Button type="submit" variant="secondary" size="sm">
                Plan day
              </Button>
            </form>
            <ViewToggle current={view} />
          </>
        }
      />

      <RoutePlanner day={day} stops={stops} />

      {total === 0 ? (
        <EmptyState
          icon={Truck}
          title="No pickups outstanding"
          description="Every scheduled handover has been confirmed."
        />
      ) : view === "cards" ? (
        <CardGrid>
          {pickups.map((pickup) => (
            <Card key={pickup.id} className="flex flex-col p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/admin/orders/${pickup.orderId}`}
                  className="font-semibold text-brand-700 hover:text-brand-800"
                >
                  {pickup.order.number}
                </Link>
                <Badge tone={STATUS_TONE[pickup.status] ?? "neutral"}>
                  {pickup.status.replace("_", " ").toLowerCase()}
                </Badge>
                {pickup.routeSequence != null && (
                  <Badge tone="neutral">
                    <Route className="size-3" aria-hidden />
                    Stop {pickup.routeSequence}
                  </Badge>
                )}
              </div>

              <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-ink-900">
                <User className="size-3.5 text-ink-400" aria-hidden />
                {pickup.order.customer.name}
              </p>
              {pickup.order.customer.phone && (
                <p className="mt-0.5 pl-5 text-xs text-ink-500">
                  {pickup.order.customer.phone}
                </p>
              )}

              <p className="mt-2 inline-flex items-start gap-1.5 text-xs text-ink-500">
                <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                {placeOf(pickup)}
              </p>

              <p className="mt-3 line-clamp-2 text-xs text-ink-500">
                {pickup.order.lines
                  .map((l) => `${l.product.name} x${l.quantity}`)
                  .join(", ")}
              </p>

              <div className="mt-4 flex items-end justify-between border-t border-line pt-3">
                <div>
                  <p className="text-xs text-ink-500">Scheduled</p>
                  <p className="text-sm font-medium text-ink-900">
                    {formatDate(pickup.scheduledFor)}
                  </p>
                  {pickup.assignedTo && (
                    <p className="text-xs text-ink-500">{pickup.assignedTo}</p>
                  )}
                </div>

                <PickupChecklist
                  pickupId={pickup.id}
                  orderNumber={pickup.order.number}
                  items={parseChecklist(pickup.checklist)}
                />
              </div>
            </Card>
          ))}
        </CardGrid>
      ) : (
        <DataTable columns={COLUMNS} minWidth="60rem">
          {pickups.map((pickup) => (
            <TableRow key={pickup.id}>
              <td className="px-4 py-3">
                <Link
                  href={`/admin/orders/${pickup.orderId}`}
                  className="font-medium text-brand-700 hover:text-brand-800"
                >
                  {pickup.order.number}
                </Link>
              </td>
              <td className="px-4 py-3">
                <p className="text-ink-900">{pickup.order.customer.name}</p>
                {pickup.order.customer.phone && (
                  <p className="text-xs text-ink-500">
                    {pickup.order.customer.phone}
                  </p>
                )}
              </td>
              <td className="max-w-64 truncate px-4 py-3 text-ink-500">
                {placeOf(pickup)}
              </td>
              <td className="px-4 py-3 text-ink-700">
                {formatDate(pickup.scheduledFor)}
                {pickup.assignedTo && (
                  <span className="block text-xs text-ink-500">
                    {pickup.assignedTo}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-ink-700">
                {pickup.routeSequence ?? "—"}
              </td>
              <td className="px-4 py-3">
                <Badge tone={STATUS_TONE[pickup.status] ?? "neutral"}>
                  {pickup.status.replace("_", " ").toLowerCase()}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end">
                  <PickupChecklist
                    pickupId={pickup.id}
                    orderNumber={pickup.order.number}
                    items={parseChecklist(pickup.checklist)}
                    compact
                  />
                </div>
              </td>
            </TableRow>
          ))}
        </DataTable>
      )}

      <Pagination
        meta={meta}
        basePath="/admin/pickups"
        params={{ view: view === "cards" ? "cards" : undefined }}
        label="pickups"
      />
    </div>
  );
}
