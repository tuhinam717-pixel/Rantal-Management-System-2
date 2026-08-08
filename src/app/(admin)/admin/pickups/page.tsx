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
import { confirmPickupAction } from "@/app/(admin)/admin/actions";
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
  searchParams: Promise<{ view?: string; page?: string }>;
}) {
  await requireRole("ADMIN");
  const { view: rawView, page } = await searchParams;
  const view = resolveView(rawView);
  const pageInfo = resolvePage(page);

  const where = { status: { not: "COMPLETED" as const } };

  const [pickups, total, done] = await Promise.all([
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
  ]);

  const meta = pageMeta(pageInfo, total);

  const placeOf = (p: (typeof pickups)[number]) =>
    p.order.shippingAddress
      ? `${p.order.shippingAddress.line1}, ${p.order.shippingAddress.city} ${p.order.shippingAddress.postalCode}`
      : "Collection from store";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pickup schedule"
        description={`${total} pending · ${done} completed · ordered by route sequence`}
        actions={<ViewToggle current={view} />}
      />

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

                <form action={confirmPickupAction}>
                  <input type="hidden" name="orderId" value={pickup.orderId} />
                  <Button type="submit" size="sm">
                    Confirm pickup
                  </Button>
                </form>
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
                  <form action={confirmPickupAction}>
                    <input type="hidden" name="orderId" value={pickup.orderId} />
                    <Button type="submit" variant="soft" size="sm">
                      Confirm
                    </Button>
                  </form>
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
