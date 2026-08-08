"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { AddressFields } from "@/components/profile/address-fields";
import {
  saveAddressAction,
  type FormState,
} from "@/app/(portal)/profile/actions";

/**
 * Lets a customer add a delivery address without leaving checkout.
 *
 * The brief asks the customer to "add the shipping details" during the rental
 * flow; sending them to the profile page mid-checkout breaks that. On success
 * the new address is handed back so checkout can select it immediately.
 */
export function AddAddressDialog({
  isFirstAddress,
  onSaved,
  variant = "button",
}: {
  isFirstAddress: boolean;
  onSaved: (addressId: string) => void;
  variant?: "button" | "link";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    saveAddressAction,
    {}
  );

  useEffect(() => {
    if (state.ok && state.addressId && open) {
      onSaved(state.addressId);
      setOpen(false);
      router.refresh();
    }
  }, [state.ok, state.addressId, open, onSaved, router]);

  return (
    <>
      {variant === "button" ? (
        <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
          <Plus className="size-4" aria-hidden />
          Add new address
        </Button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-800"
        >
          <Plus className="size-4" aria-hidden />
          Add a delivery address
        </button>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add delivery address"
        description="Saved to your profile, and used for this rental."
        size="lg"
      >
        {/*
          Nested <form> is invalid HTML, so this dialog renders its own form
          outside the checkout form via the Modal's portal to <body>.
        */}
        <form action={formAction} className="space-y-5">
          {state.error && <Alert tone="error">{state.error}</Alert>}

          <AddressFields defaultChecked={isFirstAddress} />

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isPending}>
              Save address
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
