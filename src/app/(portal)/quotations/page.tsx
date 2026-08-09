import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";

import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CardGrid, EmptyState } from "@/components/ui/data-table";
import { DateRange } from "@/components/ui/date-range";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { pageMeta, resolvePage } from "@/lib/pagination";
import { requireUser } from "@/lib/auth/current-user";
import { listQuotationsForCustomer } from "@/server/services/quotations";
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "My quotations" };

const STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  SENT: { label: "Awaiting your decision", tone: "warning" },
  CONFIRMED: { label: "Accepted", tone: "success" },
  CANCELLED: { label: "Declined", tone: "neutral" },
};

export default async function PortalQuotationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await requireUser();
  const { page } = await searchParams;
  const pageInfo = resolvePage(page, 10);

  const { items: quotations, total } = await listQuotationsForCustomer(user.id, {
    skip: pageInfo.skip,
    take: pageInfo.take,
  });

  const meta = pageMeta(pageInfo, total);
  const now = new Date();

  return (
    <div className="space-y-6">
      <PageHeader
        title="My quotations"
        description="Quotes the rental team has prepared for you. Accept one to turn it into a booking."
      />

      {quotations.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No quotations yet"
          description="When the rental team prepares a quote for you, it shows up here."
        />
      ) : (
        <CardGrid className="xl:grid-cols-2">
          {quotations.map((quotation) => {
            const status = STATUS[quotation.status] ?? {
              label: quotation.status.toLowerCase(),
              tone: "neutral" as BadgeTone,
            };
            const expired =
              quotation.status === "SENT" &&
              quotation.validUntil != null &&
              quotation.validUntil < now;

            return (
              <Card key={quotation.id} className="flex flex-col p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink-900">
                      {quotation.number}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-500">
                      Prepared {formatDate(quotation.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge tone={status.tone}>{status.label}</Badge>
                    {expired && <Badge tone="danger">Expired</Badge>}
                  </div>
                </div>

                <p className="mt-3 line-clamp-2 text-sm text-ink-700">
                  {quotation.lines
                    .map((l) => `${l.product.name} x${l.quantity}`)
                    .join(", ")}
                </p>

                {quotation.lines[0] && (
                  <DateRange
                    from={quotation.lines[0].rentalStart}
                    to={quotation.lines[0].rentalEnd}
                    className="mt-2 text-xs text-ink-500"
                  />
                )}

                <div className="mt-4 flex items-end justify-between border-t border-line pt-3">
                  <div>
                    <p className="text-xs text-ink-500">Total</p>
                    <p className="text-lg font-semibold text-ink-900">
                      {formatCurrency(Number(quotation.total))}
                    </p>
                    <p className="text-xs text-ink-500">
                      incl. {formatCurrency(Number(quotation.depositTotal))}{" "}
                      refundable deposit
                    </p>
                  </div>

                  <Link href={`/quotations/${quotation.id}`}>
                    <Button variant={quotation.status === "SENT" ? "primary" : "soft"} size="sm">
                      {quotation.status === "SENT" ? "Review" : "Details"}
                      <ArrowRight className="size-4" aria-hidden />
                    </Button>
                  </Link>
                </div>

                {quotation.order && (
                  <p className="mt-2 text-xs text-ink-500">
                    Booked as{" "}
                    <Link
                      href={`/orders/${quotation.order.id}`}
                      className="font-medium text-brand-700 hover:text-brand-800"
                    >
                      {quotation.order.number}
                    </Link>
                  </p>
                )}
              </Card>
            );
          })}
        </CardGrid>
      )}

      <Pagination meta={meta} basePath="/quotations" label="quotations" />
    </div>
  );
}
