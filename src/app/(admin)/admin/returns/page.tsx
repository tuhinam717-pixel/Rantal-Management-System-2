import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Undo2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
import { ReturnForm } from "@/components/pickup-return/return-form";
import { detectOverdueAction } from "@/app/(admin)/admin/actions";
import { requireRole } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { lateFee } from "@/lib/rental/pricing";
import { pageMeta, resolvePage } from "@/lib/pagination";
import { resolveView } from "@/lib/view-mode";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Returns" };

const COLUMNS = [
  { key: "order", label: "Order" },
  { key: "customer", label: "Customer" },
  { key: "items", label: "Items" },
  { key: "due", label: "Due" },
  { key: "deposit", label: "Deposit held", align: "right" as const },
  { key: "penalty", label: "Penalty", align: "right" as const },
  { key: "actions", label: "", align: "right" as const },
];

export default async function AdminReturnsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; page?: string }>;
}) {
  await requireRole("ADMIN");
  const { view: rawView, page } = await searchParams;
  const view = resolveView(rawView);
  const pageInfo = resolvePage(page);
  const now = new Date();

  const where = { status: { not: "COMPLETED" as const } };

  const [returns, total, overdueCount, rule] = await Promise.all([
    prisma.return.findMany({
      where,
      orderBy: { scheduledFor: "asc" },
      skip: pageInfo.skip,
      take: pageInfo.take,
      include: {
        order: {
          include: {
            customer: { select: { name: true, phone: true } },
            deposit: true,
            lines: { include: { product: { select: { id: true, name: true } } } },
          },
        },
      },
    }),
    prisma.return.count({ where }),
    prisma.return.count({ where: { ...where, scheduledFor: { lt: now } } }),
    prisma.lateFeeRule.findFirst({ where: { isActive: true } }),
  ]);

  const meta = pageMeta(pageInfo, total);

  /** Preview only — processReturn recomputes this at settlement. */
  const penaltyFor = (dueAt: Date) =>
    rule
      ? lateFee({
          dueAt,
          returnedAt: now,
          unit: rule.unit,
          amountPerUnit: Number(rule.amountPerUnit),
          graceHours: rule.graceHours,
          maxAmount: rule.maxAmount == null ? null : Number(rule.maxAmount),
        })
      : { overdueUnits: 0, amount: 0 };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Return schedule"
        description={`${total} outstanding${overdueCount > 0 ? ` · ${overdueCount} overdue` : ""}. Penalties are calculated against the active rule and deducted from the deposit on settlement.`}
        actions={
          <>
            <ViewToggle current={view} />
            <form action={detectOverdueAction}>
              <Button type="submit" variant="secondary">
                <RefreshCw className="size-4" aria-hidden />
                Detect overdue
              </Button>
            </form>
          </>
        }
      />

      {total === 0 ? (
        <EmptyState
          icon={Undo2}
          title="Nothing waiting to come back"
          description="Every rental has been returned and settled."
        />
      ) : view === "cards" ? (
        <CardGrid>
          {returns.map((ret) => {
            const overdue = ret.scheduledFor < now;
            const penalty = penaltyFor(ret.scheduledFor);
            const deposit = Number(ret.order.deposit?.amount ?? 0);

            return (
              <Card
                key={ret.id}
                className={cn(
                  "flex flex-col p-5",
                  overdue && "border-red-200 ring-1 ring-red-100"
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/admin/orders/${ret.orderId}`}
                    className="font-semibold text-brand-700 hover:text-brand-800"
                  >
                    {ret.order.number}
                  </Link>
                  {overdue && (
                    <Badge tone="danger">
                      <AlertTriangle className="size-3" aria-hidden />
                      {penalty.overdueUnits} {rule?.unit.toLowerCase() ?? "day"}
                      {penalty.overdueUnits === 1 ? "" : "s"} overdue
                    </Badge>
                  )}
                </div>

                <p className="mt-2 text-sm font-medium text-ink-900">
                  {ret.order.customer.name}
                </p>
                {ret.order.customer.phone && (
                  <p className="text-xs text-ink-500">
                    {ret.order.customer.phone}
                  </p>
                )}

                <p className="mt-2 line-clamp-2 text-xs text-ink-500">
                  {ret.order.lines
                    .map((l) => `${l.product.name} x${l.quantity}`)
                    .join(", ")}
                </p>

                <dl className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-3">
                  <div>
                    <dt className="text-xs text-ink-500">Due</dt>
                    <dd className="text-sm font-medium text-ink-900">
                      {formatDate(ret.scheduledFor)}
                    </dd>
                  </div>
                  <div className="text-right">
                    <dt className="text-xs text-ink-500">Deposit held</dt>
                    <dd className="text-sm font-medium tabular-nums text-ink-900">
                      {formatCurrency(deposit)}
                    </dd>
                  </div>
                </dl>

                {penalty.amount > 0 && (
                  <p className="mt-2 text-xs font-medium text-red-600">
                    {formatCurrency(penalty.amount)} penalty would be deducted
                  </p>
                )}

                <div className="mt-4">
                  <ReturnForm
                    orderId={ret.orderId}
                    productId={ret.order.lines[0]?.product.id ?? ""}
                    depositAmount={deposit}
                    estimatedPenalty={penalty.amount}
                  />
                </div>
              </Card>
            );
          })}
        </CardGrid>
      ) : (
        <DataTable columns={COLUMNS} minWidth="64rem">
          {returns.map((ret) => {
            const overdue = ret.scheduledFor < now;
            const penalty = penaltyFor(ret.scheduledFor);
            const deposit = Number(ret.order.deposit?.amount ?? 0);

            return (
              <TableRow key={ret.id} className={cn(overdue && "bg-red-50/60")}>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/orders/${ret.orderId}`}
                    className="font-medium text-brand-700 hover:text-brand-800"
                  >
                    {ret.order.number}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <p className="text-ink-900">{ret.order.customer.name}</p>
                  {ret.order.customer.phone && (
                    <p className="text-xs text-ink-500">
                      {ret.order.customer.phone}
                    </p>
                  )}
                </td>
                <td className="max-w-56 truncate px-4 py-3 text-ink-500">
                  {ret.order.lines
                    .map((l) => `${l.product.name} x${l.quantity}`)
                    .join(", ")}
                </td>
                <td className="px-4 py-3 text-ink-700">
                  {formatDate(ret.scheduledFor)}
                  {overdue && (
                    <span className="block text-xs font-medium text-red-600">
                      {penalty.overdueUnits}{" "}
                      {rule?.unit.toLowerCase() ?? "day"}
                      {penalty.overdueUnits === 1 ? "" : "s"} overdue
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-medium tabular-nums text-ink-900">
                  {formatCurrency(deposit)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {penalty.amount > 0 ? (
                    <span className="font-medium text-red-600">
                      {formatCurrency(penalty.amount)}
                    </span>
                  ) : (
                    <span className="text-ink-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    <ReturnForm
                      orderId={ret.orderId}
                      productId={ret.order.lines[0]?.product.id ?? ""}
                      depositAmount={deposit}
                      estimatedPenalty={penalty.amount}
                    />
                  </div>
                </td>
              </TableRow>
            );
          })}
        </DataTable>
      )}

      <Pagination
        meta={meta}
        basePath="/admin/returns"
        params={{ view: view === "cards" ? "cards" : undefined }}
        label="returns"
      />
    </div>
  );
}
