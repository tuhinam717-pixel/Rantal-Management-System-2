"use client";

import { useActionState, useState } from "react";
import { Check, MapPin, Pencil, Plus, X } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AddressFields } from "@/components/profile/address-fields";
import { DeleteButton } from "@/components/admin/delete-button";
import {
  deleteAddressAction,
  saveAddressAction,
  setDefaultAddressAction,
  type FormState,
} from "@/app/(portal)/profile/actions";
import { cn } from "@/lib/utils";
import type { AddressVM } from "@/types";

export function AddressBook({ addresses }: { addresses: AddressVM[] }) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    saveAddressAction,
    {}
  );
  // null = form closed, "" = adding, otherwise the id being edited.
  const [editing, setEditing] = useState<string | null>(null);

  const target = addresses.find((a) => a.id === editing);

  return (
    <div className="space-y-4">
      {addresses.length === 0 && editing === null && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-sm text-ink-500">
            No saved addresses yet. Add one to get rentals delivered.
          </p>
        </div>
      )}

      <ul className="space-y-3">
        {addresses.map((address) => (
          <li
            key={address.id}
            className={cn(
              "rounded-xl border bg-white p-4",
              address.isDefault ? "border-brand-300" : "border-slate-200"
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-ink-500">
                  <MapPin className="size-4" aria-hidden />
                </span>
                <div>
                  <p className="flex items-center gap-2 text-sm font-medium text-ink-900">
                    {address.label ?? "Address"}
                    {address.isDefault && (
                      <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-normal text-brand-700">
                        Default
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-sm text-ink-500">
                    {address.line1}
                    {address.line2 ? `, ${address.line2}` : ""}
                    <br />
                    {address.city}, {address.state} {address.postalCode}
                    <br />
                    {address.country}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {!address.isDefault && (
                  <form action={setDefaultAddressAction}>
                    <input type="hidden" name="id" value={address.id} />
                    <Button type="submit" variant="ghost" size="sm">
                      <Check className="size-4" aria-hidden />
                      Set default
                    </Button>
                  </form>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing(address.id)}
                >
                  <Pencil className="size-4" aria-hidden />
                  Edit
                </Button>

                <form action={deleteAddressAction}>
                  <input type="hidden" name="id" value={address.id} />
                  <DeleteButton
                    label=""
                    confirmMessage="Delete this address? Past orders keep their delivery record."
                  />
                </form>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {editing === null ? (
        <Button onClick={() => setEditing("")}>
          <Plus className="size-4" aria-hidden />
          Add address
        </Button>
      ) : (
        <form
          action={formAction}
          className="space-y-4 rounded-xl border border-slate-200 bg-white p-5"
        >
          {target && <input type="hidden" name="id" value={target.id} />}

          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink-900">
              {target ? "Edit address" : "New address"}
            </h2>
            <button
              type="button"
              onClick={() => setEditing(null)}
              aria-label="Close"
              className="grid size-8 place-items-center rounded-lg text-ink-500 hover:bg-slate-100"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>

          {state.error && <Alert tone="error">{state.error}</Alert>}
          {state.ok && <Alert tone="success">Address saved.</Alert>}

          <AddressFields
            initial={target}
            defaultChecked={target?.isDefault ?? addresses.length === 0}
          />

          <div className="flex gap-3">
            <Button type="submit" isLoading={isPending}>
              Save address
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEditing(null)}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
