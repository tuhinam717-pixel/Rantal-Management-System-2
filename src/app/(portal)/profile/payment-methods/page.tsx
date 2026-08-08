import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, CreditCard } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Payment methods" };

export default async function PaymentMethodsPage() {
  const user = await requireUser();

  // Cards are never stored. What we can show is how past rentals were paid.
  const payments = await prisma.payment.findMany({
    where: { order: { customerId: user.id }, status: "PAID" },
    orderBy: { paidAt: "desc" },
    take: 20,
    include: { order: { select: { number: true } } },
  });

  const methods = Array.from(
    new Map(
      payments
        .filter((p) => p.method)
        .map((p) => [p.method!, { method: p.method!, lastUsed: p.paidAt }])
    ).values()
  );

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link
          href="/profile"
          className="inline-flex items-center gap-1 text-sm font-medium text-ink-500 hover:text-ink-900"
        >
          <ChevronLeft className="size-4" aria-hidden />
          Profile
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink-900">
          Payment methods
        </h1>
      </div>

      <Alert tone="info">
        Card details are never stored by this application. Only the brand and
        last four digits are kept, so you can recognise which card paid for a
        rental.
      </Alert>

      {methods.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-sm text-ink-500">
            No payments yet. Cards you use at checkout will appear here.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {methods.map((m) => (
            <li
              key={m.method}
              className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-lg bg-slate-100 text-ink-500">
                  <CreditCard className="size-4" aria-hidden />
                </span>
                <span className="text-sm font-medium text-ink-900">
                  {m.method}
                </span>
              </div>
              {m.lastUsed && (
                <span className="text-xs text-ink-500">
                  Last used {formatDate(m.lastUsed)}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <section>
        <h2 className="text-sm font-semibold text-ink-900">Recent payments</h2>
        <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {payments.slice(0, 8).map((payment) => (
            <li
              key={payment.id}
              className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
            >
              <div>
                <p className="font-medium text-ink-900">
                  {payment.order.number}
                </p>
                <p className="text-xs text-ink-500">
                  {payment.purpose === "RENTAL"
                    ? "Rent"
                    : payment.purpose === "DEPOSIT"
                      ? "Security deposit"
                      : payment.purpose === "REFUND"
                        ? "Deposit refund"
                        : "Late fee"}
                  {payment.paidAt ? ` · ${formatDate(payment.paidAt)}` : ""}
                </p>
              </div>
              <span
                className={
                  payment.purpose === "REFUND"
                    ? "font-medium text-emerald-600"
                    : "font-medium text-ink-900"
                }
              >
                {payment.purpose === "REFUND" ? "+" : ""}
                {new Intl.NumberFormat("en-IN", {
                  style: "currency",
                  currency: "INR",
                }).format(Number(payment.amount))}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
