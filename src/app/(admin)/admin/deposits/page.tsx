import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, ShieldCheck, Wallet } from "lucide-react";

import { Badge, type BadgeTone } from "@/components/ui/badge";
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
import { requireRole } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { pageMeta, resolvePage } from "@/lib/pagination";
import { resolveView } from "@/lib/view-mode";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Security deposits" };

const STATUS_TONE: Record<string, BadgeTone> = {
  PENDING: "neutral",
  COLLECTED: "brand",
  HELD: "brand",
  PARTIALLY_REFUNDED: "warning",
  REFUNDED: "success",
  FORFEITED: "danger",
};

const COLUMNS = [
  { key: "order", label: "Order" },
  { key: "customer", label: "Customer" },
  { key: "basis", label: "Basis" },
  { key: "amount", label: "Held", align: "right" as const },
  { key: "deducted", label: "Deducted", align: "right" as const },
  { key: "refunded", label: "Refunded", align: "right" as const },
  { key: "status", label: "Status" },
];

export default async function AdminDepositsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; page?: string }>;
}) {
  await requireRole("ADMIN");
  const { view: rawView, page } = await searchParams;
  const view = resolveView(rawView);
  const pageInfo = resolvePage(page);

  const [deposits, total, heldAgg, settledAgg] = await Promise.all([
    prisma.securityDeposit.findMany({
      orderBy: { createdAt: "desc" },
      skip: pageInfo.skip,
      take: pageInfo.take,
      include: {
        order: { include: { customer: { select: { name: true } } } },
        transactions: { orderBy: { createdAt: "asc" } },
      },
    }),
    prisma.securityDeposit.count(),
    // Totals come from the database, not the current page, or the summary
    // would change every time you paged.
    prisma.securityDeposit.aggregate({
      where: { status: { in: ["HELD", "COLLECTED"] } },
      _sum: { amount: true },
    }),
    prisma.securityDeposit.aggregate({
      _sum: { deductedAmount: true, refundedAmount: true },
    }),
  ]);

  const meta = pageMeta(pageInfo, total);
  const held = Number(heldAgg._sum.amount ?? 0);
  const deducted = Number(settledAgg._sum.deductedAmount ?? 0);
  const refunded = Number(settledAgg._sum.refundedAmount ?? 0);

  const basisOf = (d: (typeof deposits)[number]) =>
    d.type === "PERCENTAGE" ? `${Number(d.value)}% of rent` : "Fixed amount";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security deposits"
        description="Every movement is recorded, so a deposit can always be traced end to end."
        actions={<ViewToggle current={view} />}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Currently held", value: held, Icon: Wallet, tone: "text-ink-700" },
          { label: "Refunded to date", value: refunded, Icon: ArrowUpRight, tone: "text-emerald-600" },
          { label: "Deducted as penalties", value: deducted, Icon: ArrowDownRight, tone: "text-red-600" },
        ].map(({ label, value, Icon, tone }) => (
          <div
            key={label}
            className="rounded-2xl border border-line bg-surface p-4 shadow-card"
          >
            <p className="inline-flex items-center gap-1.5 text-sm text-ink-500">
              <Icon className={cn("size-4", tone)} aria-hidden />
              {label}
            </p>
            <p className="mt-1.5 text-xl font-semibold tabular-nums text-ink-900">
              {formatCurrency(value)}
            </p>
          </div>
        ))}
      </div>

      {total === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No deposits yet"
          description="Deposits appear here once a rental is confirmed."
        />
      ) : view === "cards" ? (
        <CardGrid className="xl:grid-cols-2">
          {deposits.map((deposit) => (
            <Card key={deposit.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/orders/${deposit.orderId}`}
                      className="font-semibold text-brand-700 hover:text-brand-800"
                    >
                      {deposit.order.number}
                    </Link>
                    <Badge tone={STATUS_TONE[deposit.status] ?? "neutral"}>
                      {deposit.status.replace(/_/g, " ").toLowerCase()}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-ink-500">
                    {deposit.order.customer.name} · {basisOf(deposit)}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-lg font-semibold tabular-nums text-ink-900">
                    {formatCurrency(Number(deposit.amount))}
                  </p>
                  {Number(deposit.deductedAmount) > 0 && (
                    <p className="text-xs tabular-nums text-red-600">
                      {formatCurrency(Number(deposit.deductedAmount))} deducted
                    </p>
                  )}
                  {Number(deposit.refundedAmount) > 0 && (
                    <p className="text-xs tabular-nums text-emerald-600">
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
                          "font-medium tabular-nums",
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
            </Card>
          ))}
        </CardGrid>
      ) : (
        <DataTable columns={COLUMNS} minWidth="60rem">
          {deposits.map((deposit) => (
            <TableRow key={deposit.id}>
              <td className="px-4 py-3">
                <Link
                  href={`/admin/orders/${deposit.orderId}`}
                  className="font-medium text-brand-700 hover:text-brand-800"
                >
                  {deposit.order.number}
                </Link>
              </td>
              <td className="px-4 py-3 text-ink-700">
                {deposit.order.customer.name}
              </td>
              <td className="px-4 py-3 text-ink-500">{basisOf(deposit)}</td>
              <td className="px-4 py-3 text-right font-medium tabular-nums text-ink-900">
                {formatCurrency(Number(deposit.amount))}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {Number(deposit.deductedAmount) > 0 ? (
                  <span className="text-red-600">
                    {formatCurrency(Number(deposit.deductedAmount))}
                  </span>
                ) : (
                  <span className="text-ink-400">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {Number(deposit.refundedAmount) > 0 ? (
                  <span className="text-emerald-600">
                    {formatCurrency(Number(deposit.refundedAmount))}
                  </span>
                ) : (
                  <span className="text-ink-400">—</span>
                )}
              </td>
              <td className="px-4 py-3">
                <Badge tone={STATUS_TONE[deposit.status] ?? "neutral"}>
                  {deposit.status.replace(/_/g, " ").toLowerCase()}
                </Badge>
              </td>
            </TableRow>
          ))}
        </DataTable>
      )}

      <Pagination
        meta={meta}
        basePath="/admin/deposits"
        params={{ view: view === "cards" ? "cards" : undefined }}
        label="deposits"
      />
    </div>
  );
}
