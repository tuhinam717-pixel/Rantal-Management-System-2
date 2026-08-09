import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ChevronLeft, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/orders/status-badge";
import { DateRange } from "@/components/ui/date-range";
import { OrderQrCode } from "@/components/scan/qr-code";
import { isScannable } from "@/lib/rental/scannable";
import { requireUser } from "@/lib/auth/current-user";
import { getOrderForCustomer } from "@/server/services/orders";
import { formatCurrency } from "@/lib/utils";
import type { OrderStatus } from "@/types";

export const metadata: Metadata = { title: "Rental details" };

const DEPOSIT_COPY: Record<string, string> = {
  PENDING: "Deposit not yet collected.",
  COLLECTED: "Deposit collected.",
  HELD: "Held until the product is returned and inspected.",
  PARTIALLY_REFUNDED: "Partially refunded after a late-return penalty.",
  REFUNDED: "Fully refunded — thanks for returning on time.",
  FORFEITED: "Forfeited.",
};

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const order = await getOrderForCustomer(user.id, id);

  if (!order) notFound();

  const invoice = order.invoices[0];

  return (
    <div className="space-y-6">
      <Link
        href="/orders"
        className="inline-flex items-center gap-1 text-sm font-medium text-ink-500 hover:text-ink-900"
      >
        <ChevronLeft className="size-4" aria-hidden />
        My rentals
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
              {order.number}
            </h1>
            <StatusBadge status={order.status as OrderStatus} />
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-ink-500">
            <DateRange from={order.rentalStart} to={order.rentalEnd} />
            <span aria-hidden>·</span>
            {order.fulfilment === "DELIVERY" ? "Delivery" : "Store pickup"}
          </p>
        </div>

        <Link href={`/orders/${order.id}/invoice`}>
          <Button variant="secondary">
            <FileText className="size-4" aria-hidden />
            Invoice
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-ink-900">Items</h2>
            <ul className="mt-3 divide-y divide-slate-100">
              {order.lines.map((line) => (
                <li key={line.id} className="flex justify-between gap-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-ink-900">
                      {line.product.name}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-500">
                      {formatCurrency(Number(line.unitPrice))} per{" "}
                      {line.rentalPeriod.unit.toLowerCase()} × {line.quantity}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-medium text-ink-900">
                      {formatCurrency(Number(line.lineTotal))}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-500">
                      + {formatCurrency(Number(line.depositAmount))} deposit
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {order.shippingAddress && (
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-ink-900">
                Delivery address
              </h2>
              <p className="mt-2 text-sm text-ink-700">
                {order.shippingAddress.line1}
                {order.shippingAddress.line2
                  ? `, ${order.shippingAddress.line2}`
                  : ""}
                , {order.shippingAddress.city}, {order.shippingAddress.state}{" "}
                {order.shippingAddress.postalCode}
              </p>
            </section>
          )}

          {order.deposit && order.deposit.transactions.length > 0 && (
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-ink-900">
                Deposit history
              </h2>
              <ul className="mt-3 space-y-3">
                {order.deposit.transactions.map((txn) => (
                  <li key={txn.id} className="flex justify-between gap-4 text-sm">
                    <div>
                      <p className="font-medium text-ink-900">
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
                    <span
                      className={
                        txn.type === "DEDUCTION"
                          ? "font-medium text-red-600"
                          : "font-medium text-emerald-600"
                      }
                    >
                      {txn.type === "DEDUCTION" ? "−" : "+"}
                      {formatCurrency(Number(txn.amount))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="h-fit space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-ink-900">Payment</h2>
            <dl className="mt-3 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-500">Rent</dt>
                <dd className="font-medium text-ink-900">
                  {formatCurrency(Number(order.subtotal))}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-500">Security deposit</dt>
                <dd className="font-medium text-ink-900">
                  {formatCurrency(Number(order.depositTotal))}
                </dd>
              </div>
              {Number(order.lateFeeTotal) > 0 && (
                <div className="flex justify-between">
                  <dt className="text-ink-500">Late fee</dt>
                  <dd className="font-medium text-red-600">
                    {formatCurrency(Number(order.lateFeeTotal))}
                  </dd>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-200 pt-2.5">
                <dt className="font-medium text-ink-900">Total paid</dt>
                <dd className="text-base font-semibold text-ink-900">
                  {formatCurrency(Number(order.total))}
                </dd>
              </div>
            </dl>
          </div>

          {order.deposit && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-ink-900">
                Deposit status
              </h2>
              <p className="mt-2 text-lg font-semibold text-ink-900">
                {formatCurrency(Number(order.deposit.amount))}
              </p>
              <p className="mt-1 text-xs text-ink-500">
                {DEPOSIT_COPY[order.deposit.status]}
              </p>
            </div>
          )}

          {invoice && (
            <div className="rounded-2xl border border-line bg-surface p-5 shadow-card">
              <h2 className="text-sm font-semibold text-ink-900">Invoice</h2>
              <p className="mt-1 text-sm text-ink-500">{invoice.number}</p>
            </div>
          )}

          {isScannable(order) && (
            <div className="rounded-2xl border border-line bg-surface p-5 text-center shadow-card">
              <h2 className="text-sm font-semibold text-ink-900">
                Pickup &amp; return code
              </h2>
              <p className="mt-1 text-xs text-ink-500">
                Show this at the store. Staff scan it to hand over the product
                and again when you bring it back.
              </p>
              <div className="mt-3 flex justify-center">
                <OrderQrCode orderNumber={order.number} size={148} />
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
