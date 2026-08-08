import type { Metadata } from "next";
import { Clock, Gauge, IndianRupee, Pencil, ShieldAlert } from "lucide-react";

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
import { pageMeta, resolvePage } from "@/lib/pagination";
import { DeleteButton } from "@/components/admin/delete-button";
import { LateFeeRuleDialog } from "@/components/admin/late-fee-rule-form";
import { deleteLateFeeRuleAction } from "@/app/(admin)/admin/config-actions";
import { requireRole } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Late fees" };

const STATUS_TONE: Record<string, BadgeTone> = {
  CALCULATED: "warning",
  DEDUCTED_FROM_DEPOSIT: "brand",
  INVOICED: "info",
  WAIVED: "neutral",
  PAID: "success",
};

const COLUMNS = [
  { key: "order", label: "Order" },
  { key: "customer", label: "Customer" },
  { key: "overdue", label: "Overdue by" },
  { key: "charged", label: "Charged" },
  { key: "status", label: "Status" },
  { key: "amount", label: "Amount", align: "right" as const },
];

export default async function AdminLateFeesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireRole("ADMIN");
  const pageInfo = resolvePage((await searchParams).page);

  const [rules, fees, feeCount, charged] = await Promise.all([
    prisma.lateFeeRule.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.lateFee.findMany({
      orderBy: { calculatedAt: "desc" },
      skip: pageInfo.skip,
      take: pageInfo.take,
      include: {
        order: { include: { customer: { select: { name: true } } } },
        rule: true,
      },
    }),
    prisma.lateFee.count(),
    // Sum across all charges, not just the page being viewed.
    prisma.lateFee.aggregate({ _sum: { amount: true } }),
  ]);

  const meta = pageMeta(pageInfo, feeCount);
  const total = Number(charged._sum.amount ?? 0);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Late return fees"
        description={`${feeCount} charged · ${formatCurrency(total)} in total`}
        actions={<LateFeeRuleDialog />}
      />

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-ink-900">Charging rules</h2>

        {rules.length === 0 ? (
          <EmptyState
            icon={ShieldAlert}
            title="No charging rule configured"
            description="Without an active rule, a late return is settled with no penalty at all."
            action={<LateFeeRuleDialog />}
          />
        ) : (
          <CardGrid>
            {rules.map((rule) => (
              <Card key={rule.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-ink-900">{rule.name}</p>
                  <Badge tone={rule.isActive ? "success" : "neutral"}>
                    {rule.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>

                <dl className="mt-4 space-y-2.5 border-t border-line pt-3 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="inline-flex items-center gap-1.5 text-ink-500">
                      <IndianRupee className="size-3.5" aria-hidden />
                      Rate
                    </dt>
                    <dd className="font-medium text-ink-900">
                      {formatCurrency(Number(rule.amountPerUnit))} per{" "}
                      {rule.unit.toLowerCase()}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="inline-flex items-center gap-1.5 text-ink-500">
                      <Clock className="size-3.5" aria-hidden />
                      Grace period
                    </dt>
                    <dd className="font-medium text-ink-900">
                      {rule.graceHours} hours
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="inline-flex items-center gap-1.5 text-ink-500">
                      <Gauge className="size-3.5" aria-hidden />
                      Maximum
                    </dt>
                    <dd className="font-medium text-ink-900">
                      {rule.maxAmount == null
                        ? "Uncapped"
                        : formatCurrency(Number(rule.maxAmount))}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4 flex items-center gap-1 border-t border-line pt-3">
                  <LateFeeRuleDialog
                    initial={{
                      id: rule.id,
                      name: rule.name,
                      unit: rule.unit,
                      amountPerUnit: Number(rule.amountPerUnit),
                      graceHours: rule.graceHours,
                      maxAmount:
                        rule.maxAmount == null ? null : Number(rule.maxAmount),
                      isActive: rule.isActive,
                    }}
                    trigger={
                      <Button variant="soft" size="sm" className="flex-1">
                        <Pencil className="size-4" aria-hidden />
                        Edit rule
                      </Button>
                    }
                  />

                  <form action={deleteLateFeeRuleAction}>
                    <input type="hidden" name="id" value={rule.id} />
                    <DeleteButton
                      label=""
                      confirmMessage={`Delete rule "${rule.name}"?`}
                    />
                  </form>
                </div>
              </Card>
            ))}
          </CardGrid>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-ink-900">Charges raised</h2>

        {feeCount === 0 ? (
          <EmptyState
            icon={ShieldAlert}
            title="No late fees charged yet"
            description="Penalties appear here once an overdue rental is settled."
          />
        ) : (
          <DataTable columns={COLUMNS} minWidth="42rem">
            {fees.map((fee) => (
              <TableRow key={fee.id}>
                <td className="px-4 py-3 font-medium text-ink-900">
                  {fee.order.number}
                </td>
                <td className="px-4 py-3 text-ink-700">
                  {fee.order.customer.name}
                </td>
                <td className="px-4 py-3 text-ink-500">
                  {fee.overdueUnits} {(fee.rule?.unit ?? "DAY").toLowerCase()}
                  {fee.overdueUnits === 1 ? "" : "s"}
                </td>
                <td className="px-4 py-3 text-ink-500">
                  {formatDate(fee.calculatedAt)}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={STATUS_TONE[fee.status] ?? "neutral"}>
                    {fee.status.replace(/_/g, " ").toLowerCase()}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums text-ink-900">
                  {formatCurrency(Number(fee.amount))}
                </td>
              </TableRow>
            ))}
          </DataTable>
        )}

        <Pagination meta={meta} basePath="/admin/late-fees" label="charges" />
      </section>
    </div>
  );
}
