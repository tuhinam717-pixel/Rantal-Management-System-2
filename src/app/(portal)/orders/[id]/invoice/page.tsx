import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { PrintButton } from "@/components/orders/print-button";
import { DateRange } from "@/components/ui/date-range";
import { OrderQrCode } from "@/components/scan/qr-code";
import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { getOrderForCustomer } from "@/server/services/orders";
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Invoice" };

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const [order, settings] = await Promise.all([
    getOrderForCustomer(user.id, id),
    prisma.orgSettings.findUnique({ where: { id: "default" } }),
  ]);

  if (!order) notFound();

  const invoice = order.invoices[0];
  const company = settings?.companyName ?? "RentFlow Rentals";

  return (
    <div className="mx-auto max-w-3xl">
      {/* print:hidden keeps the button out of the printed sheet. */}
      <div className="mb-4 flex justify-end print:hidden">
        <PrintButton />
      </div>

      <article className="rounded-xl border border-slate-200 bg-white p-8 print:border-0 print:p-0">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-xl font-semibold text-ink-900">{company}</h1>
            <p className="mt-1 text-sm text-ink-500">Rental invoice</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold text-ink-900">
              {invoice?.number ?? order.number}
            </p>
            <p className="text-ink-500">
              Issued {formatDate(invoice?.issuedAt ?? order.createdAt)}
            </p>
          </div>
        </header>

        <section className="grid gap-6 border-b border-slate-200 py-6 sm:grid-cols-2">
          <div>
            <h2 className="text-xs font-medium uppercase tracking-wide text-ink-500">
              Billed to
            </h2>
            <p className="mt-2 text-sm font-medium text-ink-900">
              {order.customer.name}
            </p>
            <p className="text-sm text-ink-500">{order.customer.email}</p>
            {order.customer.phone && (
              <p className="text-sm text-ink-500">{order.customer.phone}</p>
            )}
            {order.shippingAddress && (
              <p className="mt-2 text-sm text-ink-500">
                {order.shippingAddress.line1}
                {order.shippingAddress.line2
                  ? `, ${order.shippingAddress.line2}`
                  : ""}
                <br />
                {order.shippingAddress.city}, {order.shippingAddress.state}{" "}
                {order.shippingAddress.postalCode}
              </p>
            )}
          </div>

          <div className="flex gap-6 sm:justify-end">
            <div className="sm:text-right">
              <h2 className="text-xs font-medium uppercase tracking-wide text-ink-500">
                Rental period
              </h2>
              <DateRange
                from={order.rentalStart}
                to={order.rentalEnd}
                className="mt-2 text-sm text-ink-900"
              />
              <p className="mt-2 text-sm text-ink-500">
                Order {order.number} ·{" "}
                {order.fulfilment === "DELIVERY" ? "Delivery" : "Store pickup"}
              </p>
            </div>

            {/* Scanned at handover and return, so bring this to the store. */}
            <OrderQrCode orderNumber={order.number} size={104} />
          </div>
        </section>

        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-ink-500">
              <th className="pb-2 font-medium">Item</th>
              <th className="pb-2 text-center font-medium">Qty</th>
              <th className="pb-2 text-right font-medium">Rate</th>
              <th className="pb-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {order.lines.map((line) => (
              <tr key={line.id}>
                <td className="py-3 text-ink-900">{line.product.name}</td>
                <td className="py-3 text-center text-ink-700">
                  {line.quantity}
                </td>
                <td className="py-3 text-right text-ink-700">
                  {formatCurrency(Number(line.unitPrice))} /{" "}
                  {line.rentalPeriod.unit.toLowerCase()}
                </td>
                <td className="py-3 text-right font-medium text-ink-900">
                  {formatCurrency(Number(line.lineTotal))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-6 flex justify-end">
          <dl className="w-full max-w-xs space-y-2.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-500">Rent subtotal</dt>
              <dd className="font-medium text-ink-900">
                {formatCurrency(Number(order.subtotal))}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">Security deposit (refundable)</dt>
              <dd className="font-medium text-ink-900">
                {formatCurrency(Number(order.depositTotal))}
              </dd>
            </div>
            {Number(order.lateFeeTotal) > 0 && (
              <div className="flex justify-between">
                <dt className="text-ink-500">Late return penalty</dt>
                <dd className="font-medium text-ink-900">
                  {formatCurrency(Number(order.lateFeeTotal))}
                </dd>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-200 pt-2.5">
              <dt className="font-semibold text-ink-900">Total</dt>
              <dd className="text-base font-semibold text-ink-900">
                {formatCurrency(Number(order.total))}
              </dd>
            </div>
          </dl>
        </div>

        <footer className="mt-8 border-t border-slate-200 pt-6 text-xs leading-relaxed text-ink-500">
          <p>
            The security deposit is refunded in full when the product is
            returned on or before {formatDate(order.rentalEnd)}. A late return
            attracts a penalty, which is deducted from the deposit; any balance
            is refunded to you.
          </p>
          <p className="mt-2">Thank you for renting with {company}.</p>
        </footer>
      </article>
    </div>
  );
}
