import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, Route, Truck, User } from "lucide-react";

import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CardGrid, EmptyState } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { confirmPickupAction } from "@/app/(admin)/admin/actions";
import { requireRole } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Pickups" };

const STATUS_TONE: Record<string, BadgeTone> = {
  SCHEDULED: "brand",
  IN_TRANSIT: "warning",
  COMPLETED: "success",
  MISSED: "danger",
};

export default async function AdminPickupsPage() {
  await requireRole("ADMIN");

  const pickups = await prisma.pickup.findMany({
    orderBy: [{ scheduledFor: "asc" }, { routeSequence: "asc" }],
    include: {
      order: {
        include: {
          customer: { select: { name: true, phone: true } },
          shippingAddress: true,
          lines: { include: { product: { select: { name: true } } } },
        },
      },
    },
  });

  const pending = pickups.filter((p) => p.status !== "COMPLETED");
  const done = pickups.filter((p) => p.status === "COMPLETED").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pickup schedule"
        description={`${pending.length} pending · ${done} completed · ordered by route sequence`}
      />

      {pending.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No pickups outstanding"
          description="Every scheduled handover has been confirmed."
        />
      ) : (
        <CardGrid>
          {pending.map((pickup) => (
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
                {pickup.order.shippingAddress
                  ? `${pickup.order.shippingAddress.line1}, ${pickup.order.shippingAddress.city} ${pickup.order.shippingAddress.postalCode}`
                  : "Collection from store"}
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
      )}
    </div>
  );
}
