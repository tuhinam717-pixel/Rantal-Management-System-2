import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Mail, MapPin, Phone, Store, Truck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DateRange } from "@/components/ui/date-range";
import { StatusBadge } from "@/components/orders/status-badge";
import { ReturnForm } from "@/components/pickup-return/return-form";
import { OrderQrCode } from "@/components/scan/qr-code";
import { isScannable } from "@/lib/rental/scannable";
import { confirmPickupAction } from "@/app/(admin)/admin/actions";
import { requireRole } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { lateFee } from "@/lib/rental/pricing";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type { OrderStatus } from "@/types";

export const metadata: Metadata = { title: "Order detail" };

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("ADMIN");
  const { id } = await params;
  const now = new Date();

  const [order, rule] = await Promise.all([
    prisma.rentalOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        shippingAddress: true,
        lines: { include: { product: true, rentalPeriod: true } },
        deposit: { include: { transactions: { orderBy: { createdAt: "asc" } } } },
        payments: { orderBy: { createdAt: "asc" } },
        lateFees: true,
        invoices: true,
        pickup: true,
        return: { include: { inspections: true } },
        quotation: { select: { number: true } },
      },
    }),
    prisma.lateFeeRule.findFirst({ where: { isActive: true } }),
  ]);

  if (!order) notFound();

  const settled = order.returnedAt !== null;
  const penalty =
    rule && !settled
      ? lateFee({
          dueAt: order.rentalEnd,
          returnedAt: now,
          unit: rule.unit,
          amountPerUnit: Number(rule.amountPerUnit),
          graceHours: rule.graceHours,
          maxAmount: rule.maxAmount == null ? null : Number(rule.maxAmount),
        })
      : { overdueUnits: 0, amount: 0 };

  const deposit = Number(order.deposit?.amount ?? 0);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-1 text-sm font-medium text-ink-500 hover:text-ink-900"
        >
          <ChevronLeft className="size-4" aria-hidden />
          Rental orders
        </Link>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
            {order.number}
          </h1>
          <StatusBadge status={order.status as OrderStatus} />
          {order.quotation && (
            <span className="text-sm text-ink-500">
              from quotation {order.quotation.number}
            </span>
          )}
        </div>

        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-500">
          <DateRange from={order.rentalStart} to={order.rentalEnd} />
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1.5">
            {order.fulfilment === "DELIVERY" ? (
              <>
                <Truck className="size-3.5" aria-hidden />
                Delivery
              </>
            ) : (
              <>
                <Store className="size-3.5" aria-hidden />
                Store pickup
              </>
            )}
          </span>
        </p>
      </div>

      {/* Lifecycle actions live at the top: this is the page an admin acts on. */}
      {!settled && (
        <section className="rounded-xl border border-brand-200 bg-brand-50/50 p-5">
          <h2 className="text-sm font-semibold text-ink-900">Next action</h2>

          <div className="mt-3 flex flex-wrap items-start gap-3">
            {order.pickup && order.pickup.status !== "COMPLETED" && (
              <form action={confirmPickupAction}>
                <input type="hidden" name="orderId" value={order.id} />
                <Button type="submit" size="sm">
                  Confirm pickup
                </Button>
              </form>
            )}

            {order.return && order.return.status !== "COMPLETED" && (
              <ReturnForm
                orderId={order.id}
                productId={order.lines[0]?.productId ?? ""}
                depositAmount={deposit}
                estimatedPenalty={penalty.amount}
              />
            )}
          </div>

          {penalty.amount > 0 && (
            <p className="mt-3 text-xs font-medium text-red-600">
              Currently {penalty.overdueUnits} {rule?.unit.toLowerCase()}
              {penalty.overdueUnits === 1 ? "" : "s"} overdue —{" "}
              {formatCurrency(penalty.amount)} penalty would be deducted from the
              deposit.
            </p>
          )}
        </section>
      )}

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
                    <p className="mt-0.5 font-mono text-xs text-ink-500">
                      {line.product.sku}
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

          {order.return?.inspections && order.return.inspections.length > 0 && (
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-ink-900">
                Return inspection
              </h2>
              <ul className="mt-3 space-y-3">
                {order.return.inspections.map((inspection) => (
                  <li key={inspection.id} className="text-sm">
                    <p
                      className={cn(
                        "font-medium",
                        inspection.condition === "GOOD"
                          ? "text-emerald-700"
                          : "text-red-700"
                      )}
                    >
                      {inspection.condition.replace(/_/g, " ").toLowerCase()}
                    </p>
                    {inspection.damageNote && (
                      <p className="text-xs text-ink-500">
                        {inspection.damageNote}
                      </p>
                    )}
                    {inspection.missingAccessories && (
                      <p className="text-xs text-ink-500">
                        Missing: {inspection.missingAccessories}
                      </p>
                    )}
                    {Number(inspection.damageCharge) > 0 && (
                      <p className="text-xs font-medium text-red-600">
                        {formatCurrency(Number(inspection.damageCharge))} damage
                        charge
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {order.deposit && (
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-ink-900">
                Deposit ledger
              </h2>
              <ul className="mt-3 space-y-2.5">
                {order.deposit.transactions.map((txn) => (
                  <li
                    key={txn.id}
                    className="flex justify-between gap-4 text-sm"
                  >
                    <div>
                      <p className="text-ink-900">
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
                    <div className="shrink-0 text-right">
                      <p
                        className={cn(
                          "font-medium",
                          txn.type === "DEDUCTION"
                            ? "text-red-600"
                            : "text-emerald-600"
                        )}
                      >
                        {txn.type === "DEDUCTION" ? "-" : "+"}
                        {formatCurrency(Number(txn.amount))}
                      </p>
                      <p className="text-xs text-ink-500">
                        {formatDate(txn.createdAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-ink-900">Payments</h2>
            <ul className="mt-3 divide-y divide-slate-100">
              {order.payments.map((payment) => (
                <li
                  key={payment.id}
                  className="flex justify-between gap-4 py-2.5 text-sm"
                >
                  <div>
                    <p className="text-ink-900">
                      {payment.purpose.replace(/_/g, " ").toLowerCase()}
                    </p>
                    <p className="text-xs text-ink-500">
                      {payment.method}
                      {payment.paidAt ? ` · ${formatDate(payment.paidAt)}` : ""}
                    </p>
                  </div>
                  <span className="font-medium text-ink-900">
                    {formatCurrency(Number(payment.amount))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="h-fit space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-ink-900">Customer</h2>
            <p className="mt-2 text-sm font-medium text-ink-900">
              {order.customer.name}
            </p>
            <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-ink-500">
              <Mail className="size-3.5" aria-hidden />
              {order.customer.email}
            </p>
            {order.customer.phone && (
              <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-ink-500">
                <Phone className="size-3.5" aria-hidden />
                {order.customer.phone}
              </p>
            )}
            {order.shippingAddress && (
              <p className="mt-2 inline-flex items-start gap-1.5 text-xs text-ink-500">
                <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                {order.shippingAddress.line1}, {order.shippingAddress.city}{" "}
                {order.shippingAddress.postalCode}
              </p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-ink-900">Money</h2>
            <dl className="mt-3 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-500">Rent</dt>
                <dd className="font-medium text-ink-900">
                  {formatCurrency(Number(order.subtotal))}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-500">Deposit</dt>
                <dd className="font-medium text-ink-900">
                  {formatCurrency(deposit)}
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
              {order.deposit && Number(order.deposit.refundedAmount) > 0 && (
                <div className="flex justify-between">
                  <dt className="text-ink-500">Refunded</dt>
                  <dd className="font-medium text-emerald-600">
                    {formatCurrency(Number(order.deposit.refundedAmount))}
                  </dd>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-200 pt-2.5">
                <dt className="font-medium text-ink-900">Total</dt>
                <dd className="text-base font-semibold text-ink-900">
                  {formatCurrency(Number(order.total))}
                </dd>
              </div>
            </dl>
          </div>

          {isScannable(order) && (
            <div className="rounded-2xl border border-line bg-surface p-5 text-center shadow-card">
              <h2 className="text-sm font-semibold text-ink-900">Scan code</h2>
              <p className="mt-1 text-xs text-ink-500">
                Same code as on the customer&apos;s invoice.
              </p>
              <div className="mt-3 flex justify-center">
                <OrderQrCode orderNumber={order.number} size={132} />
              </div>
            </div>
          )}

          {order.invoices.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-ink-900">Invoices</h2>
              <ul className="mt-2 space-y-1.5">
                {order.invoices.map((invoice) => (
                  <li key={invoice.id} className="flex justify-between text-sm">
                    <span className="text-ink-700">{invoice.number}</span>
                    <span className="text-ink-500">
                      {formatCurrency(Number(invoice.amount))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
