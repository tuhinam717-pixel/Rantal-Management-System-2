"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import { MapPin, Store, Truck } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldRow } from "@/components/ui/form-shell";
import { AddAddressDialog } from "@/components/cart/add-address-dialog";
import { checkoutAction, type CheckoutState } from "@/app/(portal)/checkout/actions";
import { cn } from "@/lib/utils";
import type { AddressVM } from "@/types";

export function CheckoutForm({ addresses }: { addresses: AddressVM[] }) {
  const [state, formAction, isPending] = useActionState<CheckoutState, FormData>(
    checkoutAction,
    {}
  );

  const [fulfilment, setFulfilment] = useState<"DELIVERY" | "STORE_PICKUP">(
    "DELIVERY"
  );
  const [addressId, setAddressId] = useState(
    addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? ""
  );

  // A newly added address arrives via router.refresh(); adopt it if the current
  // selection no longer exists (or nothing was selected yet).
  useEffect(() => {
    if (addresses.length === 0) return;
    if (!addresses.some((a) => a.id === addressId)) {
      setAddressId(addresses.find((a) => a.isDefault)?.id ?? addresses[0].id);
    }
  }, [addresses, addressId]);

  const handleSaved = useCallback((id: string) => setAddressId(id), []);

  const options = [
    {
      value: "DELIVERY" as const,
      Icon: Truck,
      title: "Deliver to me",
      body: "We bring it to your address.",
    },
    {
      value: "STORE_PICKUP" as const,
      Icon: Store,
      title: "Collect from store",
      body: "Pick it up and drop it back yourself.",
    },
  ];

  return (
    <form action={formAction} className="space-y-6">
      {state.error && <Alert tone="error">{state.error}</Alert>}

      <input type="hidden" name="fulfilment" value={fulfilment} />
      {fulfilment === "DELIVERY" && (
        <input type="hidden" name="shippingAddressId" value={addressId} />
      )}

      <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
        <h2 className="text-sm font-semibold text-ink-900">
          How do you want it?
        </h2>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {options.map(({ value, Icon, title, body }) => (
            <button
              key={value}
              type="button"
              onClick={() => setFulfilment(value)}
              aria-pressed={fulfilment === value}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors",
                fulfilment === value
                  ? "border-brand-500 bg-brand-100 ring-1 ring-brand-500"
                  : "border-line hover:border-brand-300"
              )}
            >
              <Icon className="mt-0.5 size-4 shrink-0 text-brand-700" aria-hidden />
              <span>
                <span className="block text-sm font-medium text-ink-900">
                  {title}
                </span>
                <span className="block text-xs text-ink-500">{body}</span>
              </span>
            </button>
          ))}
        </div>

        {fulfilment === "DELIVERY" && (
          <div className="mt-4 space-y-3">
            {addresses.length === 0 ? (
              <div className="rounded-xl border border-dashed border-brand-300 bg-brand-50/50 px-5 py-8 text-center">
                <span className="mx-auto grid size-10 place-items-center rounded-full bg-brand-200 text-brand-800">
                  <MapPin className="size-4" aria-hidden />
                </span>
                <p className="mt-3 text-sm font-medium text-ink-900">
                  No delivery address yet
                </p>
                <p className="mx-auto mt-1 max-w-xs text-sm text-ink-500">
                  Add one here to get this rental delivered, or switch to
                  collecting from the store.
                </p>
                <div className="mt-4 flex justify-center">
                  <AddAddressDialog isFirstAddress onSaved={handleSaved} />
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {addresses.map((address) => (
                    <label
                      key={address.id}
                      className={cn(
                        "flex cursor-pointer gap-3 rounded-xl border p-3.5 transition-colors",
                        addressId === address.id
                          ? "border-brand-500 bg-brand-100"
                          : "border-line hover:border-brand-300"
                      )}
                    >
                      <input
                        type="radio"
                        name="addressChoice"
                        checked={addressId === address.id}
                        onChange={() => setAddressId(address.id)}
                        className="mt-1 size-4 border-line text-brand-600 focus:ring-brand-600"
                      />
                      <span className="text-sm">
                        <span className="block font-medium text-ink-900">
                          {address.label ?? "Address"}
                          {address.isDefault && (
                            <span className="ml-2 rounded-full bg-brand-200 px-2 py-0.5 text-xs font-normal text-brand-800">
                              Default
                            </span>
                          )}
                        </span>
                        <span className="block text-ink-500">
                          {address.line1}
                          {address.line2 ? `, ${address.line2}` : ""},{" "}
                          {address.city}, {address.state} {address.postalCode}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>

                <AddAddressDialog
                  isFirstAddress={false}
                  onSaved={handleSaved}
                  variant="link"
                />
              </>
            )}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
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
          <FieldRow>
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
          </FieldRow>
        </div>
      </section>

      <Button
        type="submit"
        size="lg"
        className="w-full"
        isLoading={isPending}
        disabled={fulfilment === "DELIVERY" && !addressId}
      >
        {isPending ? "Placing order…" : "Pay and confirm rental"}
      </Button>
    </form>
  );
}
