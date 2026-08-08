import type { Metadata } from "next";
import { ArrowDownRight, ArrowUpRight, Wallet } from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Security deposits" };

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-slate-100 text-slate-700",
  COLLECTED: "bg-brand-50 text-brand-700",
  HELD: "bg-brand-50 text-brand-700",
  PARTIALLY_REFUNDED: "bg-amber-50 text-amber-700",
  REFUNDED: "bg-emerald-50 text-emerald-700",
  FORFEITED: "bg-red-50 text-red-700",
};

export default async function AdminDepositsPage() {
  await requireRole("ADMIN");

  const deposits = await prisma.securityDeposit.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      order: {
        include: { customer: { select: { name: true } } },
      },
      transactions: { orderBy: { createdAt: "asc" } },
    },
  });

  const held = deposits
    .filter((d) => d.status === "HELD" || d.status === "COLLECTED")
    .reduce((sum, d) => sum + Number(d.amount), 0);
  const refunded = deposits.reduce(
    (sum, d) => sum + Number(d.refundedAmount),
    0
  );
  const deducted = deposits.reduce(
    (sum, d) => sum + Number(d.deductedAmount),
    0
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security deposits"
        description="Every movement is recorded, so a deposit can always be traced end to end."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-card">
          <p className="inline-flex items-center gap-1.5 text-sm text-ink-500">
            <Wallet className="size-4" aria-hidden />
            Currently held
          </p>
          <p className="mt-1.5 text-xl font-semibold text-ink-900">
            {formatCurrency(held)}
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-card">
          <p className="inline-flex items-center gap-1.5 text-sm text-ink-500">
            <ArrowUpRight className="size-4 text-emerald-600" aria-hidden />
            Refunded to date
          </p>
          <p className="mt-1.5 text-xl font-semibold text-ink-900">
            {formatCurrency(refunded)}
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-card">
          <p className="inline-flex items-center gap-1.5 text-sm text-ink-500">
            <ArrowDownRight className="size-4 text-red-600" aria-hidden />
            Deducted as penalties
          </p>
          <p className="mt-1.5 text-xl font-semibold text-ink-900">
            {formatCurrency(deducted)}
          </p>
        </div>
      </div>

      <ul className="space-y-3">
        {deposits.map((deposit) => (
          <li
            key={deposit.id}
            className="rounded-2xl border border-line bg-surface p-5 shadow-card"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="font-semibold text-ink-900">
                    {deposit.order.number}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-medium",
                      STATUS_STYLES[deposit.status]
                    )}
                  >
                    {deposit.status.replace(/_/g, " ").toLowerCase()}
                  </span>
                </div>
                <p className="mt-1 text-sm text-ink-500">
                  {deposit.order.customer.name} ·{" "}
                  {deposit.type === "PERCENTAGE"
                    ? `${Number(deposit.value)}% of rent`
                    : "Fixed amount"}
                </p>
              </div>

              <div className="text-right">
                <p className="text-lg font-semibold text-ink-900">
                  {formatCurrency(Number(deposit.amount))}
                </p>
                {Number(deposit.deductedAmount) > 0 && (
                  <p className="text-xs text-red-600">
                    {formatCurrency(Number(deposit.deductedAmount))} deducted
                  </p>
                )}
                {Number(deposit.refundedAmount) > 0 && (
                  <p className="text-xs text-emerald-600">
                    {formatCurrency(Number(deposit.refundedAmount))} refunded
                  </p>
                )}
              </div>
            </div>

            <ol className="mt-4 space-y-2 border-t border-line pt-3">
              {deposit.transactions.map((txn) => (
                <li
                  key={txn.id}
                  className="flex items-start justify-between gap-4 text-sm"
                >
                  <div className="flex items-start gap-2">
                    {txn.type === "DEDUCTION" ? (
                      <ArrowDownRight
                        className="mt-0.5 size-4 shrink-0 text-red-600"
                        aria-hidden
                      />
                    ) : (
                      <ArrowUpRight
                        className={cn(
                          "mt-0.5 size-4 shrink-0",
                          txn.type === "REFUND"
                            ? "text-emerald-600"
                            : "text-brand-600"
                        )}
                        aria-hidden
                      />
                    )}
                    <div>
                      <p className="text-ink-900">
                        {txn.type === "COLLECTION"
                          ? "Collected"
                          : txn.type === "DEDUCTION"
                            ? "Deducted"
                            : "Refunded"}
                      </p>
                      {txn.note && (
                        <p className="text-xs text-ink-500">{txn.note}</p>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className={cn(
                        "font-medium",
                        txn.type === "DEDUCTION"
                          ? "text-red-600"
                          : "text-emerald-600"
                      )}
                    >
                      {txn.type === "DEDUCTION" ? "-" : "+"}
                      {formatCurrency(Number(txn.amount))}
                    </p>
                    <p className="text-xs text-ink-500">
                      {formatDate(txn.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </li>
        ))}
      </ul>
    </div>
  );
}
