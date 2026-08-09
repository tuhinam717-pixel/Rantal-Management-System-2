import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { ArrowRight, Radar } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CardGrid, EmptyState } from "@/components/ui/data-table";
import { DateRange } from "@/components/ui/date-range";
import { ListToolbar } from "@/components/ui/list-toolbar";
import { OrderTrack } from "@/components/orders/order-track";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { StatusBadge } from "@/components/orders/status-badge";
import { pageMeta, resolvePage } from "@/lib/pagination";
import { resolveEnumFilter, textSearch } from "@/lib/list-query";
import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import type { OrderStatus } from "@/types";

export const metadata: Metadata = { title: "Track my rentals" };

const STAGE_FILTERS = [
  { value: undefined, label: "In progress" },
  { value: "awaiting", label: "Awaiting pickup" },
  { value: "out", label: "I have it" },
  { value: "closed", label: "Finished" },
];

export default async function PortalTrackingPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; stage?: string }>;
}) {
  const user = await requireUser();
  const { page, q, stage } = await searchParams;
  const pageInfo = resolvePage(page, 10);

  const safeStage = resolveEnumFilter(
    stage,
    STAGE_FILTERS.map((f) => f.value)
  );

  const search = textSearch(q, ["number", "lines.some.product.name"]);

  const stageWhere: Prisma.RentalOrderWhereInput =
    safeStage === "awaiting"
      ? { status: { in: ["CONFIRMED", "READY_FOR_PICKUP"] } }
      : safeStage === "out"
        ? { status: { in: ["PICKED_UP", "ACTIVE", "RETURN_DUE", "OVERDUE"] } }
        : safeStage === "closed"
          ? { status: { in: ["RETURNED", "COMPLETED", "CANCELLED"] } }
          : { status: { notIn: ["COMPLETED", "CANCELLED"] } };

  // customerId comes from the session, never the query string — this is the
  // whole difference between this page and the admin board.
  const where: Prisma.RentalOrderWhereInput = {
    customerId: user.id,
    ...stageWhere,
    ...(search ? { OR: search } : {}),
  };

  const [orders, total] = await Promise.all([
    prisma.rentalOrder.findMany({
      where,
      // Newest booking first, matching the admin board's default.
      orderBy: { createdAt: "desc" },
      skip: pageInfo.skip,
      take: pageInfo.take,
      include: {
        lines: { include: { product: { select: { name: true } } } },
        pickup: { select: { confirmedAt: true, scheduledFor: true } },
        return: { select: { receivedAt: true, scheduledFor: true } },
      },
    }),
    prisma.rentalOrder.count({ where }),
  ]);

  const meta = pageMeta(pageInfo, total);
  const listParams = { q, stage };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Track my rentals"
        description="Where each of your rentals has got to, from booking to the deposit coming back."
      />

      <ListToolbar
        basePath="/tracking"
        params={listParams}
        searchPlaceholder="Search order no. or product…"
        filters={[{ key: "stage", options: STAGE_FILTERS }]}
      />

      {orders.length === 0 ? (
        <EmptyState
          icon={Radar}
          title={q || stage ? "Nothing matches" : "Nothing in progress"}
          description={
            q || stage
              ? "Try a different search term or stage."
              : "Book a rental and you can follow it here at every step."
          }
          action={
            q || stage ? undefined : (
              <Link href="/products">
                <Button>
                  Browse rentals
                  <ArrowRight className="size-4" aria-hidden />
                </Button>
              </Link>
            )
          }
        />
      ) : (
        <CardGrid className="xl:grid-cols-2">
          {orders.map((order) => (
            <Card key={order.id} className="flex flex-col p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/orders/${order.id}`}
                    className="font-semibold text-brand-700 hover:text-brand-800"
                  >
                    {order.number}
                  </Link>
                  <p className="mt-0.5 truncate text-sm text-ink-700">
                    {order.lines
                      .map((l) => `${l.product.name} x${l.quantity}`)
                      .join(", ")}
                  </p>
                  <DateRange
                    from={order.rentalStart}
                    to={order.rentalEnd}
                    className="text-xs text-ink-500"
                  />
                </div>

                <div className="shrink-0 text-right">
                  <StatusBadge status={order.status as OrderStatus} />
                  <p className="mt-1 text-sm font-medium tabular-nums text-ink-900">
                    {formatCurrency(Number(order.total))}
                  </p>
                </div>
              </div>

              <div className="mt-4 border-t border-line pt-4">
                <OrderTrack order={order} />
              </div>
            </Card>
          ))}
        </CardGrid>
      )}

      <Pagination
        meta={meta}
        basePath="/tracking"
        params={listParams}
        label="rentals"
      />
    </div>
  );
}
