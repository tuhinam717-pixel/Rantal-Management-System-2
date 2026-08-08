import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";

import { CheckoutForm } from "@/components/cart/checkout-form";
import { DateRange } from "@/components/ui/date-range";
import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { getCart } from "@/server/services/cart";
import { formatCurrency } from "@/lib/utils";
import type { AddressVM } from "@/types";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const user = await requireUser();
  const cart = await getCart(user.id);

  if (cart.items.length === 0) redirect("/cart");

  const rows = await prisma.address.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });

  const addresses: AddressVM[] = rows.map((a) => ({
    id: a.id,
    label: a.label ?? undefined,
    line1: a.line1,
    line2: a.line2 ?? undefined,
    city: a.city,
    state: a.state,
    postalCode: a.postalCode,
    country: a.country,
    isDefault: a.isDefault,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          Checkout
        </h1>
        <Link
          href="/cart"
          className="mt-1 inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900"
        >
          <ChevronLeft className="size-4" aria-hidden />
          Back to cart
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <CheckoutForm addresses={addresses} />

        <aside className="h-fit rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-ink-900">Order summary</h2>

          <ul className="mt-4 space-y-3 border-b border-slate-200 pb-4">
            {cart.items.map((item) => (
              <li key={item.id} className="text-sm">
                <p className="font-medium text-ink-900">
                  {item.product.name}{" "}
                  <span className="text-ink-500">× {item.quantity}</span>
                </p>
                <DateRange
                  from={item.rentalStart}
                  to={item.rentalEnd}
                  className="text-xs text-ink-500"
                />
                <p className="mt-0.5 text-xs text-ink-500">
                  {formatCurrency(item.lineTotal)} rent ·{" "}
                  {formatCurrency(item.depositAmount)} deposit
                </p>
              </li>
            ))}
          </ul>

          <dl className="mt-4 space-y-2.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-500">Rent total</dt>
              <dd className="font-medium text-ink-900">
                {formatCurrency(cart.rentTotal)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">Security deposit</dt>
              <dd className="font-medium text-ink-900">
                {formatCurrency(cart.depositTotal)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2.5">
              <dt className="font-medium text-ink-900">Payable now</dt>
              <dd className="text-base font-semibold text-ink-900">
                {formatCurrency(cart.grandTotal)}
              </dd>
            </div>
          </dl>

          <p className="mt-3 text-xs text-ink-500">
            Return on time and the full {formatCurrency(cart.depositTotal)}{" "}
            deposit comes back to you.
          </p>
        </aside>
      </div>
    </div>
  );
}
