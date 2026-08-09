import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, FileText, XCircle } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { ViewToggle } from "@/components/ui/view-toggle";
import { DataTable, EmptyState, TableRow } from "@/components/ui/data-table";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { ListToolbar } from "@/components/ui/list-toolbar";
import { pageMeta, resolvePage } from "@/lib/pagination";
import { resolveSort, textSearch, type SortOption } from "@/lib/list-query";
import type { Prisma } from "@prisma/client";
import { resolveView } from "@/lib/view-mode";
import { DateRange } from "@/components/ui/date-range";
import { DeleteButton } from "@/components/admin/delete-button";
import { QuotationBuilder } from "@/components/admin/quotation-builder";
import {
  cancelQuotationAction,
  confirmQuotationAction,
  deleteQuotationAction,
} from "./actions";
import { requireRole } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { getActivePricelistId } from "@/server/services/catalog";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { RentalUnit } from "@/types";

export const metadata: Metadata = { title: "Quotations" };

const SORTS: SortOption<Prisma.QuotationOrderByWithRelationInput>[] = [
  { value: "newest", label: "Newest first", orderBy: { createdAt: "desc" } },
  { value: "oldest", label: "Oldest first", orderBy: { createdAt: "asc" } },
  { value: "value", label: "Highest value", orderBy: { total: "desc" } },
  { value: "value-asc", label: "Lowest value", orderBy: { total: "asc" } },
  { value: "number", label: "Quote number", orderBy: { number: "asc" } },
];

const STATUS_TONE: Record<string, BadgeTone> = {
  DRAFT: "neutral",
  SENT: "brand",
  CONFIRMED: "success",
  CANCELLED: "danger",
};

const COLUMNS = [
  { key: "number", label: "Quotation" },
  { key: "customer", label: "Customer" },
  { key: "items", label: "Items" },
  { key: "status", label: "Status" },
  { key: "rent", label: "Rent", align: "right" as const },
  { key: "deposit", label: "Deposit", align: "right" as const },
  { key: "total", label: "Total", align: "right" as const },
];

export default async function AdminQuotationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string;
    page?: string;
    q?: string;
    sort?: string;
    status?: string;
    error?: string;
  }>;
}) {
  await requireRole("ADMIN");
  const { view: rawView, page, q, sort, status, error } = await searchParams;
  const view = resolveView(rawView);
  const pageInfo = resolvePage(page);
  const activeSort = resolveSort(sort, SORTS);

  const search = textSearch(q, [
    "number",
    "customer.name",
    "customer.email",
  ]);

  const where: Prisma.QuotationWhereInput = {
    ...(status ? { status: status as Prisma.EnumQuotationStatusFilter["equals"] } : {}),
    ...(search ? { OR: search } : {}),
  };

  const pricelistId = await getActivePricelistId();

  const [quotations, total, customers, products, periods] = await Promise.all([
    prisma.quotation.findMany({
      where,
      orderBy: activeSort.orderBy,
      skip: pageInfo.skip,
      take: pageInfo.take,
      include: {
        customer: { select: { name: true, email: true } },
        lines: { include: { product: { select: { name: true } } } },
        order: { select: { number: true } },
        template: { select: { paymentTermsPercent: true } },
      },
    }),
    prisma.quotation.count({ where }),
    prisma.user.findMany({
      where: { role: "CUSTOMER", isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    }),
    prisma.product.findMany({
      where: { isRentable: true },
      orderBy: { name: "asc" },
      include: { pricelistItems: { where: { pricelistId } } },
    }),
    prisma.rentalPeriod.findMany({ where: { isActive: true }, orderBy: { id: "asc" } }),
  ]);

  const meta = pageMeta(pageInfo, total);
  const listParams = { view: rawView, q, sort, status };
  const filtered = Boolean(q || status);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quotations"
        description="For walk-in customers: build a quotation, then confirm it to create the rental order, invoice and deposit in one step."
        actions={
          <>
            <ViewToggle current={view} />
            <Link href="/admin/quotations/templates">
              <Button variant="secondary">Templates</Button>
            </Link>
            <QuotationBuilder
              customers={customers}
              products={products.map((p) => ({
                id: p.id,
                name: p.name,
                depositType: p.depositType,
                depositValue: Number(p.depositValue),
                rates: p.pricelistItems.map((i) => ({
                  rentalPeriodId: i.rentalPeriodId,
                  price: Number(i.price),
                })),
              }))}
              periods={periods.map((p) => ({
                id: p.id,
                name: p.name,
                unit: p.unit as RentalUnit,
                duration: p.duration,
              }))}
            />
          </>
        }
      />

      {error && <Alert tone="error">{error}</Alert>}

      <ListToolbar
        basePath="/admin/quotations"
        params={listParams}
        searchPlaceholder="Search quote no. or customer…"
        sortOptions={SORTS.map(({ value, label }) => ({ value, label }))}
        filters={[
          {
            key: "status",
            label: "Status",
            options: [
              { value: undefined, label: "All" },
              { value: "DRAFT", label: "Draft" },
              { value: "SENT", label: "Sent" },
              { value: "CONFIRMED", label: "Confirmed" },
              { value: "CANCELLED", label: "Cancelled" },
            ],
          },
        ]}
      />

      {quotations.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={filtered ? "No quotations match" : "No quotations yet"}
          description={
            filtered
              ? "Try a different search term or status."
              : "Build one for a walk-in customer, then confirm it into a rental order."
          }
        />
      ) : view === "table" ? (
        <DataTable columns={COLUMNS} minWidth="60rem">
          {quotations.map((q) => (
            <TableRow key={q.id}>
              <td className="px-4 py-3">
                <p className="font-medium text-ink-900">{q.number}</p>
                {q.order && (
                  <p className="text-xs text-ink-500">Order {q.order.number}</p>
                )}
              </td>
              <td className="px-4 py-3">
                <p className="text-ink-900">{q.customer.name}</p>
                <p className="truncate text-xs text-ink-500">
                  {q.customer.email}
                </p>
              </td>
              <td className="max-w-56 truncate px-4 py-3 text-ink-500">
                {q.lines.map((l) => `${l.product.name} x${l.quantity}`).join(", ")}
              </td>
              <td className="px-4 py-3">
                <Badge tone={STATUS_TONE[q.status] ?? "neutral"}>
                  {q.status.toLowerCase()}
                </Badge>
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-ink-700">
                {formatCurrency(Number(q.subtotal))}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-ink-700">
                {formatCurrency(Number(q.depositTotal))}
              </td>
              <td className="px-4 py-3 text-right font-medium tabular-nums text-ink-900">
                {formatCurrency(Number(q.total))}
              </td>
            </TableRow>
          ))}
        </DataTable>
      ) : (
        <div className="space-y-3">
          {quotations.map((q) => (
              <div
                key={q.id}
                className="rounded-2xl border border-line bg-surface p-5 shadow-card"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-semibold text-ink-900">
                        {q.number}
                      </span>
                      <Badge tone={STATUS_TONE[q.status] ?? "neutral"}>
                        {q.status.toLowerCase()}
                      </Badge>
                      {q.order && (
                        <span className="text-xs text-ink-500">
                          Order {q.order.number}
                        </span>
                      )}
                    </div>

                    <p className="mt-1.5 text-sm text-ink-700">
                      {q.customer.name}
                      <span className="text-ink-500"> · {q.customer.email}</span>
                    </p>

                    <p className="mt-1 text-xs text-ink-500">
                      {q.lines
                        .map((l) => `${l.product.name} x${l.quantity}`)
                        .join(", ")}
                    </p>

                    {q.lines[0] && (
                      <DateRange
                        from={q.lines[0].rentalStart}
                        to={q.lines[0].rentalEnd}
                        className="mt-1 text-xs text-ink-500"
                      />
                    )}

                    {q.validUntil && q.status !== "CONFIRMED" && (
                      <p className="mt-1 text-xs text-ink-500">
                        Valid until {formatDate(q.validUntil)}
                      </p>
                    )}
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="font-semibold text-ink-900">
                      {formatCurrency(Number(q.total))}
                    </p>
                    <p className="text-xs text-ink-500">
                      {formatCurrency(Number(q.subtotal))} rent +{" "}
                      {formatCurrency(Number(q.depositTotal))} deposit
                    </p>
                    {q.template &&
                      q.template.paymentTermsPercent < 100 && (
                        <p className="mt-1 text-xs font-medium text-brand-700">
                          {q.template.paymentTermsPercent}% up front —{" "}
                          {formatCurrency(
                            (Number(q.total) * q.template.paymentTermsPercent) /
                              100
                          )}
                        </p>
                      )}
                  </div>
                </div>

                {q.status !== "CONFIRMED" && q.status !== "CANCELLED" && (
                  <div className="mt-4 flex flex-wrap items-center gap-1 border-t border-line pt-3">
                    {/*
                      Not the admin accepting on the customer’s behalf — the
                      customer accepts from their own portal. This is the
                      counter case from the brief: they said yes in person, so
                      the booking is recorded for them.
                    */}
                    <form action={confirmQuotationAction}>
                      <input type="hidden" name="id" value={q.id} />
                      <Button type="submit" variant="secondary" size="sm">
                        <CheckCircle2 className="size-4" aria-hidden />
                        Confirm at counter
                      </Button>
                    </form>

                    <form action={cancelQuotationAction}>
                      <input type="hidden" name="id" value={q.id} />
                      <Button type="submit" variant="ghost" size="sm">
                        <XCircle className="size-4" aria-hidden />
                        Cancel
                      </Button>
                    </form>

                    <form action={deleteQuotationAction}>
                      <input type="hidden" name="id" value={q.id} />
                      <DeleteButton
                        label=""
                        confirmMessage={`Delete quotation ${q.number}?`}
                      />
                    </form>
                  </div>
                )}
              </div>
          ))}
        </div>
      )}

      <Pagination
        meta={meta}
        basePath="/admin/quotations"
        params={listParams}
        label="quotations"
      />
    </div>
  );
}
