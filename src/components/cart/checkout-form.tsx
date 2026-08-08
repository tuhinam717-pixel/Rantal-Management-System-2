"use client";

import { useActionState, useState } from "react";
import { Store, Truck } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { checkoutAction, type CheckoutState } from "@/app/(portal)/checkout/actions";
import { cn } from "@/lib/utils";
import type { AddressVM } from "@/types";

export function CheckoutForm({ addresses }: { addresses: AddressVM[] }) {
  const [state, formAction, isPending] = useActionState<CheckoutState, FormData>(
    checkoutAction,
    {}
  );

  const [fulfilment, setFulfilment] = useState<"DELIVERY" | "STORE_PICKUP">(
    addresses.length > 0 ? "DELIVERY" : "STORE_PICKUP"
  );
  const [addressId, setAddressId] = useState(
    addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? ""
  );

  return (
    <form action={formAction} className="space-y-6">
      {state.error && <Alert tone="error">{state.error}</Alert>}

      <input type="hidden" name="fulfilment" value={fulfilment} />
      {fulfilment === "DELIVERY" && (
        <input type="hidden" name="shippingAddressId" value={addressId} />
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-ink-900">How do you want it?</h2>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setFulfilment("DELIVERY")}
            className={cn(
              "flex items-start gap-3 rounded-lg border p-3.5 text-left transition-colors",
              fulfilment === "DELIVERY"
                ? "border-brand-600 bg-brand-50 ring-1 ring-brand-600"
                : "border-slate-200 hover:border-slate-300"
            )}
          >
            <Truck className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden />
            <span>
              <span className="block text-sm font-medium text-ink-900">
                Deliver to me
              </span>
              <span className="block text-xs text-ink-500">
                We bring it to your address.
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFulfilment("STORE_PICKUP")}
            className={cn(
              "flex items-start gap-3 rounded-lg border p-3.5 text-left transition-colors",
              fulfilment === "STORE_PICKUP"
                ? "border-brand-600 bg-brand-50 ring-1 ring-brand-600"
                : "border-slate-200 hover:border-slate-300"
            )}
          >
            <Store className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden />
            <span>
              <span className="block text-sm font-medium text-ink-900">
                Collect from store
              </span>
              <span className="block text-xs text-ink-500">
                Pick it up and drop it back yourself.
              </span>
            </span>
          </button>
        </div>

        {fulfilment === "DELIVERY" && (
          <div className="mt-4 space-y-2">
            {addresses.length === 0 ? (
              <Alert tone="info">
                You have no saved addresses. Add one from your profile, or
                choose “Collect from store”.
              </Alert>
            ) : (
              addresses.map((address) => (
                <label
                  key={address.id}
                  className={cn(
                    "flex cursor-pointer gap-3 rounded-lg border p-3.5 transition-colors",
                    addressId === address.id
                      ? "border-brand-600 bg-brand-50"
                      : "border-slate-200 hover:border-slate-300"
                  )}
                >
                  <input
                    type="radio"
                    name="addressChoice"
                    checked={addressId === address.id}
                    onChange={() => setAddressId(address.id)}
                    className="mt-1 size-4 text-brand-600 focus:ring-brand-600"
                  />
                  <span className="text-sm">
                    <span className="block font-medium text-ink-900">
                      {address.label ?? "Address"}
                      {address.isDefault && (
                        <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-ink-500">
                          Default
                        </span>
                      )}
                    </span>
                    <span className="block text-ink-500">
                      {address.line1}
                      {address.line2 ? `, ${address.line2}` : ""}, {address.city},{" "}
                      {address.state} {address.postalCode}
                    </span>
                  </span>
                </label>
              ))
            )}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-ink-900">Payment</h2>
        <p className="mt-1 text-xs text-ink-500">
          You are paying the rent and the refundable security deposit together.
        </p>

        <div className="mt-4 space-y-4">
          <Input
            label="Name on card"
            name="cardName"
            autoComplete="cc-name"
            placeholder="Faizan Alam"
            required
          />
          <Input
            label="Card number"
            name="cardNumber"
            inputMode="numeric"
            autoComplete="cc-number"
            placeholder="4242 4242 4242 4242"
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Expiry"
              name="expiry"
              placeholder="12/28"
              autoComplete="cc-exp"
              required
            />
            <Input
              label="CVV"
              name="cvv"
              inputMode="numeric"
              placeholder="123"
              autoComplete="cc-csc"
              required
            />
          </div>
        </div>
      </section>

      <Button type="submit" size="lg" className="w-full" isLoading={isPending}>
        {isPending ? "Placing order…" : "Pay and confirm rental"}
      </Button>
    </form>
  );
}
