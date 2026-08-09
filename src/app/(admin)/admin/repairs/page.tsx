import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { PlayCircle, Wrench } from "lucide-react";

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
import { ListToolbar } from "@/components/ui/list-toolbar";
import { ViewToggle } from "@/components/ui/view-toggle";
import { resolveSort, textSearch, type SortOption } from "@/lib/list-query";
import {
  CloseRepairDialog,
  OpenRepairDialog,
} from "@/components/admin/repair-actions";
import { startRepairAction } from "./actions";
import { requireRole } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { pageMeta, resolvePage } from "@/lib/pagination";
import { resolveView } from "@/lib/view-mode";
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Repairs" };

const SORTS: SortOption<Prisma.RepairJobOrderByWithRelationInput>[] = [
  { value: "newest", label: "Newest first", orderBy: { openedAt: "desc" } },
  { value: "oldest", label: "Oldest first", orderBy: { openedAt: "asc" } },
  { value: "product", label: "Product A–Z", orderBy: { product: { name: "asc" } } },
  { value: "units", label: "Most units", orderBy: { quantity: "desc" } },
];

const STATUS_TONE: Record<string, BadgeTone> = {
  PENDING: "warning",
  IN_PROGRESS: "info",
  COMPLETED: "success",
  WRITTEN_OFF: "danger",
};

const COLUMNS = [
  { key: "product", label: "Product" },
  { key: "issue", label: "Issue" },
  { key: "from", label: "From order" },
  { key: "units", label: "Units", align: "right" as const },
  { key: "cost", label: "Cost", align: "right" as const },
  { key: "status", label: "Status" },
  { key: "actions", label: "", align: "right" as const },
];

export default async function AdminRepairsPage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string;
    page?: string;
    status?: string;
    q?: string;
    sort?: string;
  }>;
}) {
  await requireRole("ADMIN");
  const { view: rawView, page, status, q, sort } = await searchParams;
  const view = resolveView(rawView);
  const pageInfo = resolvePage(page);
  const activeSort = resolveSort(sort, SORTS);

  const open = status !== "closed";
  const search = textSearch(q, ["product.name", "product.sku", "issue"]);

  const where: Prisma.RepairJobWhereInput = {
    status: open
      ? { in: ["PENDING", "IN_PROGRESS"] }
      : { in: ["COMPLETED", "WRITTEN_OFF"] },
    ...(search ? { OR: search } : {}),
  };

  const [jobs, total, outOfService, spend, products, vendors] = await Promise.all([
    prisma.repairJob.findMany({
      where,
      orderBy: activeSort.orderBy,
      skip: pageInfo.skip,
      take: pageInfo.take,
      include: { product: { select: { name: true, sku: true } } },
    }),
    prisma.repairJob.count({ where }),
    prisma.repairJob.aggregate({
      where: { status: { in: ["PENDING", "IN_PROGRESS"] } },
      _sum: { quantity: true },
    }),
    prisma.repairJob.aggregate({
      where: { status: "COMPLETED" },
      _sum: { actualCost: true },
    }),
    prisma.product.findMany({
      where: { isRentable: true },
      orderBy: { name: "asc" },
      take: 200,
      select: {
        id: true,
        name: true,
        totalStock: true,
        reservedStock: true,
        underRepairStock: true,
      },
    }),
    prisma.vendor.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const meta = pageMeta(pageInfo, total);
  const productOptions = products.map((p) => ({
    id: p.id,
    name: p.name,
    available: Math.max(0, p.totalStock - p.reservedStock - p.underRepairStock),
  }));

  const listParams = { view: rawView, q, sort, status };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Repairs"
        description={`${outOfService._sum.quantity ?? 0} unit(s) out of service · ${formatCurrency(Number(spend._sum.actualCost ?? 0))} spent on completed repairs`}
        actions={
          <>
            <ViewToggle current={view} />
            <OpenRepairDialog products={productOptions} vendors={vendors} />
          </>
        }
      />

      <ListToolbar
        basePath="/admin/repairs"
        params={listParams}
        searchPlaceholder="Search product, SKU or issue…"
        sortOptions={SORTS.map(({ value, label }) => ({ value, label }))}
        filters={[
          {
            key: "status",
            options: [
              { value: undefined, label: "Open" },
              { value: "closed", label: "Closed" },
            ],
          },
        ]}
      />

      {jobs.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title={
            q
              ? "No repair jobs match"
              : open
                ? "Nothing in the workshop"
                : "No closed jobs yet"
          }
          description={
            q
              ? "Try a different search term."
              : open
                ? "Repair jobs open automatically when a return is inspected as damaged."
                : "Completed and written-off repairs appear here."
          }
        />
      ) : view === "cards" ? (
        <CardGrid>
          {jobs.map((job) => (
            <Card key={job.id} className="flex flex-col p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-ink-900">
                  {job.product.name}
                </span>
                <Badge tone={STATUS_TONE[job.status] ?? "neutral"}>
                  {job.status.replace(/_/g, " ").toLowerCase()}
                </Badge>
                {job.vendorReady && (
                  <span className="ml-1.5">
                    <Badge tone="success">Vendor ready</Badge>
                  </span>
                )}
              </div>
              <p className="mt-0.5 font-mono text-xs text-ink-500">
                {job.product.sku}
              </p>

              <p className="mt-3 text-sm text-ink-700">{job.issue}</p>

              {job.orderNumber && (
                <p className="mt-1 text-xs text-ink-500">
                  From order {job.orderNumber}
                </p>
              )}

              <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3 text-center">
                <div>
                  <dt className="text-xs text-ink-500">Units</dt>
                  <dd className="text-sm font-semibold tabular-nums text-ink-900">
                    {job.quantity}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-500">
                    {job.actualCost == null ? "Estimated" : "Actual"}
                  </dt>
                  <dd className="text-sm font-semibold tabular-nums text-ink-900">
                    {formatCurrency(
                      Number(job.actualCost ?? job.estimatedCost)
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-500">Opened</dt>
                  <dd className="text-sm font-semibold text-ink-900">
                    {formatDate(job.openedAt)}
                  </dd>
                </div>
              </dl>

              {(job.status === "PENDING" || job.status === "IN_PROGRESS") && (
                <div className="mt-4 flex flex-wrap items-center gap-1 border-t border-line pt-3">
                  {job.status === "PENDING" && (
                    <form action={startRepairAction}>
                      <input type="hidden" name="id" value={job.id} />
                      <Button type="submit" variant="soft" size="sm">
                        <PlayCircle className="size-4" aria-hidden />
                        Start
                      </Button>
                    </form>
                  )}
                  <CloseRepairDialog
                    id={job.id}
                    productName={job.product.name}
                    quantity={job.quantity}
                    estimatedCost={Number(job.estimatedCost)}
                  />
                </div>
              )}
            </Card>
          ))}
        </CardGrid>
      ) : (
        <DataTable columns={COLUMNS} minWidth="64rem">
          {jobs.map((job) => (
            <TableRow key={job.id}>
              <td className="px-4 py-3">
                <p className="font-medium text-ink-900">{job.product.name}</p>
                <p className="font-mono text-xs text-ink-500">
                  {job.product.sku}
                </p>
              </td>
              <td className="max-w-64 truncate px-4 py-3 text-ink-700">
                {job.issue}
              </td>
              <td className="px-4 py-3 text-ink-500">
                {job.orderNumber ?? "Manual"}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-ink-900">
                {job.quantity}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-ink-700">
                {formatCurrency(Number(job.actualCost ?? job.estimatedCost))}
                {job.actualCost == null && (
                  <span className="block text-xs text-ink-400">estimated</span>
                )}
              </td>
              <td className="px-4 py-3">
                <Badge tone={STATUS_TONE[job.status] ?? "neutral"}>
                  {job.status.replace(/_/g, " ").toLowerCase()}
                </Badge>
                {job.vendorReady && (
                  <span className="ml-1.5">
                    <Badge tone="success">Vendor ready</Badge>
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                  {job.status === "PENDING" && (
                    <form action={startRepairAction}>
                      <input type="hidden" name="id" value={job.id} />
                      <Button type="submit" variant="ghost" size="sm">
                        <PlayCircle className="size-4" aria-hidden />
                        Start
                      </Button>
                    </form>
                  )}
                  {(job.status === "PENDING" || job.status === "IN_PROGRESS") && (
                    <CloseRepairDialog
                      id={job.id}
                      productName={job.product.name}
                      quantity={job.quantity}
                      estimatedCost={Number(job.estimatedCost)}
                    />
                  )}
                  {job.completedAt && (
                    <span className="text-xs text-ink-500">
                      {formatDate(job.completedAt)}
                    </span>
                  )}
                </div>
              </td>
            </TableRow>
          ))}
        </DataTable>
      )}

      <Pagination
        meta={meta}
        basePath="/admin/repairs"
        params={listParams}
        label="repair jobs"
      />
    </div>
  );
}
