import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, ImageOff, Trash2 } from "lucide-react";

import { AppImage } from "@/components/ui/app-image";
import { Button } from "@/components/ui/button";
import { DateRange } from "@/components/ui/date-range";
import { removeItemAction, updateQuantityAction } from "./actions";
import { requireUser } from "@/lib/auth/current-user";
import { getCart } from "@/server/services/cart";
import { formatCurrency } from "@/lib/utils";

export const metadata: Metadata = { title: "Cart" };

export default async function CartPage() {
  const user = await requireUser();
  const cart = await getCart(user.id);

  if (cart.items.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          Your cart
        </h1>
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-sm text-ink-500">Your cart is empty.</p>
          <Link
            href="/products"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            Browse rentals
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
        Your cart
      </h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <ul className="space-y-4">
          {cart.items.map((item) => (
            <li
              key={item.id}
              className="flex gap-4 rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="relative size-24 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                {item.product.imageUrl ? (
                  <AppImage
                    src={item.product.imageUrl}
                    alt={item.product.name}
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                ) : (
                  <span className="grid size-full place-items-center text-slate-300">
                    <ImageOff className="size-5" aria-hidden />
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <Link
                  href={`/products/${item.product.slug}`}
                  className="text-sm font-semibold text-ink-900 hover:text-brand-600"
                >
                  {item.product.name}
                </Link>

                <p className="mt-1 text-xs text-ink-500">
                  {item.rentalPeriod.name} ·{" "}
                  {formatCurrency(item.rentalPeriod.price)} per{" "}
                  {item.rentalPeriod.unit.toLowerCase()}
                </p>
                <DateRange
                  from={item.rentalStart}
                  to={item.rentalEnd}
                  className="mt-0.5 text-xs text-ink-500"
                />

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <form action={updateQuantityAction} className="flex items-center gap-2">
                    <input type="hidden" name="itemId" value={item.id} />
                    <label
                      htmlFor={`qty-${item.id}`}
                      className="text-xs text-ink-500"
                    >
                      Qty
                    </label>
                    <input
                      id={`qty-${item.id}`}
                      name="quantity"
                      type="number"
                      min={1}
                      defaultValue={item.quantity}
                      className="w-16 rounded-lg border-0 bg-white py-1.5 pl-2.5 text-sm shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-brand-600"
                    />
                    <Button type="submit" variant="secondary" size="sm">
                      Update
                    </Button>
                  </form>

                  <form action={removeItemAction}>
                    <input type="hidden" name="itemId" value={item.id} />
                    <Button type="submit" variant="ghost" size="sm">
                      <Trash2 className="size-4" aria-hidden />
                      Remove
                    </Button>
                  </form>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold text-ink-900">
                  {formatCurrency(item.lineTotal)}
                </p>
                <p className="mt-0.5 text-xs text-ink-500">
                  + {formatCurrency(item.depositAmount)} deposit
                </p>
              </div>
            </li>
          ))}
        </ul>

        {/* Rent and deposit stay on separate lines, per the brief. */}
        <aside className="h-fit rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-ink-900">Order summary</h2>

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
            The deposit is fully refunded when you return on time. If the return
            is late, a penalty is deducted from it and the rest refunded.
          </p>

          <Link href="/checkout" className="mt-5 block">
            <Button size="lg" className="w-full">
              Proceed to checkout
            </Button>
          </Link>
        </aside>
      </div>
    </div>
  );
}
