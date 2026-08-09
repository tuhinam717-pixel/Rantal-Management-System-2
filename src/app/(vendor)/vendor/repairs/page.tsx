import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { Wrench } from "lucide-react";

import { Badge, type BadgeTone } from "@/components/ui/badge";
import { DataTable, EmptyState, TableRow } from "@/components/ui/data-table";
import { ListToolbar } from "@/components/ui/list-toolbar";
import { PageHeader } from "@/components/ui/page-header";
import { RepairProgressDialog } from "@/components/vendor/repair-progress-form";
import { Pagination } from "@/components/ui/pagination";
import { pageMeta, resolvePage } from "@/lib/pagination";
import { resolveSort, textSearch, type SortOption } from "@/lib/list-query";
import { requireVendor } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Repair jobs" };

const STATUS_TONE: Record<string, BadgeTone> = {
  PENDING: "warning",
  IN_PROGRESS: "info",
  COMPLETED: "success",
  WRITTEN_OFF: "danger",
};

const SORTS: SortOption<Prisma.RepairJobOrderByWithRelationInput>[] = [
  { value: "newest", label: "Newest first", orderBy: { openedAt: "desc" } },
  { value: "oldest", label: "Oldest first", orderBy: { openedAt: "asc" } },
  { value: "product", label: "Product A–Z", orderBy: { product: { name: "asc" } } },
  { value: "units", label: "Most units", orderBy: { quantity: "desc" } },
];

const COLUMNS = [
  { key: "product", label: "Product" },
  { key: "issue", label: "Issue" },
  { key: "units", label: "Units", align: "right" as const },
  { key: "cost", label: "Cost", align: "right" as const },
  { key: "opened", label: "Opened" },
  { key: "status", label: "Status" },
  { key: "actions", label: "", align: "right" as const },
];

export default async function VendorRepairsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    sort?: string;
    status?: string;
  }>;
}) {
  const { vendor } = await requireVendor();
  const { page, q, sort, status } = await searchParams;
  const pageInfo = resolvePage(page);
  const activeSort = resolveSort(sort, SORTS);

  const search = textSearch(q, ["product.name", "product.sku", "issue"]);

  const where: Prisma.RepairJobWhereInput = {
    vendorId: vendor.id,
    ...(status === "open"
      ? { status: { in: ["PENDING", "IN_PROGRESS"] } }
      : status === "closed"
        ? { status: { in: ["COMPLETED", "WRITTEN_OFF"] } }
        : {}),
    ...(search ? { OR: search } : {}),
  };

  const [jobs, total] = await Promise.all([
    prisma.repairJob.findMany({
      where,
      orderBy: activeSort.orderBy,
      skip: pageInfo.skip,
      take: pageInfo.take,
      include: { product: { select: { name: true, sku: true } } },
    }),
    prisma.repairJob.count({ where }),
  ]);

  const meta = pageMeta(pageInfo, total);
  const listParams = { q, sort, status };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Repair jobs"
        description="Units this business has sent to you for repair. Status is updated by their team when the units come back."
      />

      <ListToolbar
        basePath="/vendor/repairs"
        params={listParams}
        searchPlaceholder="Search product, SKU or issue…"
        sortOptions={SORTS.map(({ value, label }) => ({ value, label }))}
        filters={[
          {
            key: "status",
            options: [
              { value: undefined, label: "All" },
              { value: "open", label: "Open" },
              { value: "closed", label: "Closed" },
            ],
          },
        ]}
      />

      {jobs.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title={q || status ? "No jobs match" : "No repair jobs yet"}
          description={
            q || status
              ? "Try a different search term or status."
              : "Jobs appear here when a damaged unit is sent to you."
          }
        />
      ) : (
        <DataTable columns={COLUMNS} minWidth="54rem">
          {jobs.map((job) => (
            <TableRow key={job.id}>
              <td className="px-4 py-3">
                <p className="font-medium text-ink-900">{job.product.name}</p>
                <p className="font-mono text-xs text-ink-500">
                  {job.product.sku}
                </p>
              </td>

              <td className="max-w-72 px-4 py-3 text-ink-700">
                <p className="truncate">{job.issue}</p>
                {job.orderNumber && (
                  <p className="text-xs text-ink-500">
                    From order {job.orderNumber}
                  </p>
                )}
              </td>

              <td className="px-4 py-3 text-right tabular-nums text-ink-900">
                {job.quantity}
              </td>

              <td className="px-4 py-3 text-right">
                <p className="tabular-nums text-ink-900">
                  {formatCurrency(Number(job.actualCost ?? job.estimatedCost))}
                </p>
                <p className="text-xs text-ink-500">
                  {job.actualCost == null ? "estimated" : "actual"}
                </p>
              </td>

              <td className="px-4 py-3 text-ink-500">
                {formatDate(job.openedAt)}
              </td>

              <td className="px-4 py-3">
                <Badge tone={STATUS_TONE[job.status] ?? "neutral"}>
                  {job.status.replace(/_/g, " ").toLowerCase()}
                </Badge>
                {job.vendorReady && (
                  <span className="ml-1.5">
                    <Badge tone="success">Ready</Badge>
                  </span>
                )}
                {job.quoteApproved === true && (
                  <span className="ml-1.5">
                    <Badge tone="success">Quote approved</Badge>
                  </span>
                )}
                {job.quoteApproved === false && (
                  <span className="ml-1.5">
                    <Badge tone="danger">Quote rejected</Badge>
                  </span>
                )}
                {job.quoteSubmittedAt && job.quoteApproved == null && (
                  <span className="ml-1.5">
                    <Badge tone="info">Quote sent</Badge>
                  </span>
                )}
                {job.notes && (
                  <p className="mt-1 max-w-56 truncate text-xs text-ink-500">
                    {job.notes}
                  </p>
                )}
              </td>

              <td className="px-4 py-3 text-right">
                {job.status === "PENDING" || job.status === "IN_PROGRESS" ? (
                  <RepairProgressDialog
                    job={{
                      id: job.id,
                      productName: job.product.name,
                      issue: job.issue,
                      status: job.status,
                      notes: job.notes ?? "",
                      actualCost:
                        job.actualCost == null ? null : Number(job.actualCost),
                      vendorReady: job.vendorReady,
                    }}
                  />
                ) : (
                  <span className="text-xs text-ink-400">Closed</span>
                )}
              </td>
            </TableRow>
          ))}
        </DataTable>
      )}

      <Pagination
        meta={meta}
        basePath="/vendor/repairs"
        params={listParams}
        label="repair jobs"
      />
    </div>
  );
}
