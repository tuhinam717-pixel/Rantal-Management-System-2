import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, FileText, Send, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { DateRange } from "@/components/ui/date-range";
import { DeleteButton } from "@/components/admin/delete-button";
import { QuotationBuilder } from "@/components/admin/quotation-builder";
import {
  cancelQuotationAction,
  confirmQuotationAction,
  deleteQuotationAction,
  sendQuotationAction,
} from "./actions";
import { requireRole } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { getActivePricelistId } from "@/server/services/catalog";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type { RentalUnit } from "@/types";

export const metadata: Metadata = { title: "Quotations" };

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SENT: "bg-brand-50 text-brand-700",
  CONFIRMED: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-red-50 text-red-700",
};

export default async function AdminQuotationsPage() {
  await requireRole("ADMIN");

  const pricelistId = await getActivePricelistId();

  const [quotations, customers, products, periods] = await Promise.all([
    prisma.quotation.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { name: true, email: true } },
        lines: { include: { product: { select: { name: true } } } },
        order: { select: { number: true } },
      },
    }),
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quotations"
        description="For walk-in customers: build a quotation, then confirm it to create the rental order, invoice and deposit in one step."
        actions={
          <>
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

      <div>
        <div className="space-y-3">
          {quotations.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <p className="inline-flex items-center gap-2 text-sm text-ink-500">
                <FileText className="size-4" aria-hidden />
                No quotations yet. Build one on the right.
              </p>
            </div>
          ) : (
            quotations.map((q) => (
              <div
                key={q.id}
                className="rounded-xl border border-slate-200 bg-white p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-semibold text-ink-900">
                        {q.number}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-medium",
                          STATUS_STYLES[q.status]
                        )}
                      >
                        {q.status.toLowerCase()}
                      </span>
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
                  </div>
                </div>

                {q.status !== "CONFIRMED" && q.status !== "CANCELLED" && (
                  <div className="mt-4 flex flex-wrap items-center gap-1 border-t border-slate-100 pt-3">
                    {q.status === "DRAFT" && (
                      <form action={sendQuotationAction}>
                        <input type="hidden" name="id" value={q.id} />
                        <Button type="submit" variant="secondary" size="sm">
                          <Send className="size-4" aria-hidden />
                          Mark as sent
                        </Button>
                      </form>
                    )}

                    <form action={confirmQuotationAction}>
                      <input type="hidden" name="id" value={q.id} />
                      <Button type="submit" size="sm">
                        <CheckCircle2 className="size-4" aria-hidden />
                        Confirm and create order
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
            ))
          )}
        </div>
      </div>
    </div>
  );
}
