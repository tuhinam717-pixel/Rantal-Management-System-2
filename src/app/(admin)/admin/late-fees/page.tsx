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
import { ListToolbar } from "@/components/ui/list-toolbar";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { pageMeta, resolvePage } from "@/lib/pagination";
import {
  resolveEnumFilter,
  resolveSort,
  textSearch,
  type SortOption,
} from "@/lib/list-query";
import type { Prisma } from "@prisma/client";
import { DeleteButton } from "@/components/admin/delete-button";
import { LateFeeRuleDialog } from "@/components/admin/late-fee-rule-form";
import { deleteLateFeeRuleAction } from "@/app/(admin)/admin/config-actions";
import { requireRole } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Late fees" };

const SORTS: SortOption<Prisma.LateFeeOrderByWithRelationInput>[] = [
  { value: "newest", label: "Newest first", orderBy: { calculatedAt: "desc" } },
  { value: "oldest", label: "Oldest first", orderBy: { calculatedAt: "asc" } },
  { value: "amount", label: "Highest amount", orderBy: { amount: "desc" } },
  { value: "amount-asc", label: "Lowest amount", orderBy: { amount: "asc" } },
];

const LATE_FEE_STATUSES = [
  "CALCULATED",
  "DEDUCTED_FROM_DEPOSIT",
  "INVOICED",
  "WAIVED",
  "PAID",
] as const;

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
  searchParams: Promise<{
    page?: string;
    q?: string;
    sort?: string;
    status?: string;
  }>;
}) {
  await requireRole("ADMIN");
  const { page, q, sort, status } = await searchParams;
  const pageInfo = resolvePage(page);
  const activeSort = resolveSort(sort, SORTS);

  const search = textSearch(q, ["order.number", "order.customer.name"]);

  const safeStatus = resolveEnumFilter(status, LATE_FEE_STATUSES);

  const where: Prisma.LateFeeWhereInput = {
    ...(safeStatus
      ? { status: safeStatus as Prisma.EnumLateFeeStatusFilter["equals"] }
      : {}),
    ...(search ? { OR: search } : {}),
  };

  const [rules, fees, feeCount, charged] = await Promise.all([
    prisma.lateFeeRule.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.lateFee.findMany({
      where,
      orderBy: activeSort.orderBy,
      skip: pageInfo.skip,
      take: pageInfo.take,
      include: {
        order: { include: { customer: { select: { name: true } } } },
        rule: true,
      },
    }),
    prisma.lateFee.count({ where }),
    // Sum across all charges, not just the page being viewed.
    prisma.lateFee.aggregate({ _sum: { amount: true } }),
  ]);

  const meta = pageMeta(pageInfo, feeCount);
  const listParams = { q, sort, status };
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

        <ListToolbar
          basePath="/admin/late-fees"
          params={listParams}
          searchPlaceholder="Search order no. or customer…"
          sortOptions={SORTS.map(({ value, label }) => ({ value, label }))}
          filters={[
            {
              key: "status",
              label: "Status",
              options: [
                { value: undefined, label: "All" },
                { value: "CALCULATED", label: "Calculated" },
                { value: "DEDUCTED_FROM_DEPOSIT", label: "Deducted" },
                { value: "INVOICED", label: "Invoiced" },
                { value: "PAID", label: "Paid" },
                { value: "WAIVED", label: "Waived" },
              ],
            },
          ]}
        />

        {fees.length === 0 ? (
          <EmptyState
            icon={ShieldAlert}
            title={q || status ? "No charges match" : "No late fees charged yet"}
            description={
              q || status
                ? "Try a different search term or status."
                : "Penalties appear here once an overdue rental is settled."
            }
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

        <Pagination
          meta={meta}
          basePath="/admin/late-fees"
          params={listParams}
          label="charges"
        />
      </section>
    </div>
  );
}
