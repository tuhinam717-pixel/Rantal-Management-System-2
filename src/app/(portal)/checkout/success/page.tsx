import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

export const metadata: Metadata = { title: "Order confirmed" };

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const user = await requireUser();
  const { order: orderNumber } = await searchParams;

  const order = orderNumber
    ? await prisma.rentalOrder.findFirst({
        where: { number: orderNumber, customerId: user.id },
        include: { deposit: true },
      })
    : null;

  return (
    <div className="mx-auto max-w-lg py-8 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-50 text-emerald-600">
        <CheckCircle2 className="size-7" aria-hidden />
      </span>

      <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink-900">
        Rental confirmed
      </h1>
      <p className="mt-2 text-sm text-ink-500">
        {order
          ? `Order ${order.number} is confirmed. We've emailed your invoice.`
          : "Your rental order has been placed."}
      </p>

      {order && (
        <dl className="mt-6 space-y-2.5 rounded-xl border border-slate-200 bg-white p-5 text-left text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-500">Order number</dt>
            <dd className="font-medium text-ink-900">{order.number}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-500">Rent</dt>
            <dd className="font-medium text-ink-900">
              {formatCurrency(Number(order.subtotal))}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-500">Security deposit held</dt>
            <dd className="font-medium text-ink-900">
              {formatCurrency(Number(order.depositTotal))}
            </dd>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-2.5">
            <dt className="font-medium text-ink-900">Paid</dt>
            <dd className="text-base font-semibold text-ink-900">
              {formatCurrency(Number(order.total))}
            </dd>
          </div>
        </dl>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        {order && (
          <Link href={`/orders/${order.id}/invoice`}>
            <Button variant="secondary" className="w-full sm:w-auto">
              Download invoice
            </Button>
          </Link>
        )}
        <Link href="/orders">
          <Button className="w-full sm:w-auto">View my rentals</Button>
        </Link>
      </div>
    </div>
  );
}
