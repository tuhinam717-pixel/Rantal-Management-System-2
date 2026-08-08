import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Undo2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CardGrid, EmptyState } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { ReturnForm } from "@/components/pickup-return/return-form";
import { detectOverdueAction } from "@/app/(admin)/admin/actions";
import { requireRole } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { lateFee } from "@/lib/rental/pricing";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Returns" };

export default async function AdminReturnsPage() {
  await requireRole("ADMIN");
  const now = new Date();

  const [returns, rule] = await Promise.all([
    prisma.return.findMany({
      where: { status: { not: "COMPLETED" } },
      orderBy: { scheduledFor: "asc" },
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
    prisma.lateFeeRule.findFirst({ where: { isActive: true } }),
  ]);

  const overdueCount = returns.filter((r) => r.scheduledFor < now).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Return schedule"
        description={`${returns.length} outstanding${overdueCount > 0 ? ` · ${overdueCount} overdue` : ""}. Penalties are calculated against the active rule and deducted from the deposit on settlement.`}
        actions={
          <form action={detectOverdueAction}>
            <Button type="submit" variant="secondary">
              <RefreshCw className="size-4" aria-hidden />
              Detect overdue
            </Button>
          </form>
        }
      />

      {returns.length === 0 ? (
        <EmptyState
          icon={Undo2}
          title="Nothing waiting to come back"
          description="Every rental has been returned and settled."
        />
      ) : (
        <CardGrid>
          {returns.map((ret) => {
            const overdue = ret.scheduledFor < now;

            // Preview only — processReturn recomputes this at settlement.
            const penalty = rule
              ? lateFee({
                  dueAt: ret.scheduledFor,
                  returnedAt: now,
                  unit: rule.unit,
                  amountPerUnit: Number(rule.amountPerUnit),
                  graceHours: rule.graceHours,
                  maxAmount:
                    rule.maxAmount == null ? null : Number(rule.maxAmount),
                })
              : { overdueUnits: 0, amount: 0 };

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
                    <dd className="text-sm font-medium text-ink-900">
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
      )}
    </div>
  );
}
