import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable, TableRow } from "@/components/ui/data-table";
import { DateRange } from "@/components/ui/date-range";
import { PageHeader } from "@/components/ui/page-header";
import { QuotationDecision } from "@/components/portal/quotation-decision";
import { requireUser } from "@/lib/auth/current-user";
import { getQuotationForCustomer } from "@/server/services/quotations";
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Quotation" };

const STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  SENT: { label: "Awaiting your decision", tone: "warning" },
  CONFIRMED: { label: "Accepted", tone: "success" },
  // Either side can end a quotation, so the label stays neutral rather than
  // telling the customer they declined something the admin cancelled.
  CANCELLED: { label: "Cancelled", tone: "neutral" },
};

const COLUMNS = [
  { key: "item", label: "Item" },
  { key: "period", label: "Rental period" },
  { key: "qty", label: "Qty", align: "right" as const },
  { key: "rate", label: "Rate", align: "right" as const },
  { key: "total", label: "Total", align: "right" as const },
];

export default async function PortalQuotationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const quotation = await getQuotationForCustomer(user.id, id);
  if (!quotation) notFound();

  const status = STATUS[quotation.status] ?? {
    label: quotation.status.toLowerCase(),
    tone: "neutral" as BadgeTone,
  };

  const expired =
    quotation.validUntil != null && quotation.validUntil < new Date();
  const decidable = quotation.status === "SENT" && !expired;

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        back={{ href: "/quotations", label: "My quotations" }}
        title={quotation.number}
        description={`Prepared ${formatDate(quotation.createdAt)}`}
        actions={
          <div className="flex flex-wrap gap-1.5">
            <Badge tone={status.tone}>{status.label}</Badge>
            {expired && quotation.status === "SENT" && (
              <Badge tone="danger">Expired</Badge>
            )}
          </div>
        }
      />

      {quotation.template?.header && (
        <Card className="p-5 text-sm whitespace-pre-line text-ink-700">
          {quotation.template.header}
        </Card>
      )}

      <DataTable columns={COLUMNS} minWidth="44rem">
        {quotation.lines.map((line) => (
          <TableRow key={line.id}>
            <td className="px-4 py-3">
              <p className="font-medium text-ink-900">{line.product.name}</p>
              <p className="font-mono text-xs text-ink-500">
                {line.product.sku}
              </p>
            </td>
            <td className="px-4 py-3 text-ink-500">
              <DateRange from={line.rentalStart} to={line.rentalEnd} />
              <p className="text-xs">{line.rentalPeriod.name}</p>
            </td>
            <td className="px-4 py-3 text-right tabular-nums text-ink-900">
              {line.quantity}
            </td>
            <td className="px-4 py-3 text-right tabular-nums text-ink-700">
              {formatCurrency(Number(line.unitPrice))}
            </td>
            <td className="px-4 py-3 text-right font-medium tabular-nums text-ink-900">
              {formatCurrency(Number(line.lineTotal))}
            </td>
          </TableRow>
        ))}
      </DataTable>

      <Card className="p-5">
        <dl className="ml-auto max-w-xs space-y-2 text-sm">
          <div className="flex items-center justify-between gap-6">
            <dt className="text-ink-500">Rent</dt>
            <dd className="tabular-nums text-ink-900">
              {formatCurrency(Number(quotation.subtotal))}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-6">
            <dt className="text-ink-500">Security deposit</dt>
            <dd className="tabular-nums text-ink-900">
              {formatCurrency(Number(quotation.depositTotal))}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-6 border-t border-line pt-2">
            <dt className="font-medium text-ink-900">Total payable</dt>
            <dd className="text-lg font-semibold tabular-nums text-ink-900">
              {formatCurrency(Number(quotation.total))}
            </dd>
          </div>
          {quotation.validUntil && (
            <p className="pt-1 text-xs text-ink-500">
              Valid until {formatDate(quotation.validUntil)}
            </p>
          )}
        </dl>
      </Card>

      {quotation.template?.terms && (
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-ink-900">Terms</h2>
          <p className="mt-2 text-sm whitespace-pre-line text-ink-600">
            {quotation.template.terms}
          </p>
        </Card>
      )}

      {decidable ? (
        <Card className="p-5">
          <QuotationDecision
            quotationId={quotation.id}
            total={formatCurrency(Number(quotation.total))}
          />
        </Card>
      ) : quotation.order ? (
        <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
          <p className="text-sm text-ink-700">
            This quotation is confirmed — it is now rental{" "}
            <span className="font-medium">{quotation.order.number}</span>.
          </p>
          <Link href={`/orders/${quotation.order.id}`}>
            <Button variant="soft" size="sm">
              View rental
            </Button>
          </Link>
        </Card>
      ) : (
        <Card className="p-5">
          <p className="text-sm text-ink-500">
            {expired
              ? "This quotation has expired. Ask the rental team for a fresh one."
              : "This quotation was cancelled."}
          </p>
        </Card>
      )}

      {quotation.template?.footer && (
        <p className="text-xs whitespace-pre-line text-ink-500">
          {quotation.template.footer}
        </p>
      )}
    </div>
  );
}
