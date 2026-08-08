"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldRow } from "@/components/ui/form-shell";
import { ImageUpload } from "@/components/ui/image-upload";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  saveCustomerAction,
  type FormState,
} from "@/app/(admin)/admin/customers/actions";

export interface CustomerInitial {
  id: string;
  name: string;
  email: string;
  phone: string;
  imageUrl: string;
}

/**
 * Create or edit a customer from the admin side — the counter case in the
 * brief, where someone walks in without a portal account.
 *
 * `onCreated` lets the quotation builder pick up the new customer without a
 * page navigation that would lose the half-built quotation.
 */
export function CustomerDialog({
  initial,
  trigger,
  onCreated,
}: {
  initial?: CustomerInitial;
  trigger?: React.ReactNode;
  onCreated?: (customer: { id: string; name: string; email: string }) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    saveCustomerAction,
    {}
  );

  const editing = Boolean(initial?.id);

  useEffect(() => {
    if (!state.ok || !open) return;

    setOpen(false);
    if (state.customer) onCreated?.(state.customer);
    router.refresh();
  }, [state.ok, state.customer, open, onCreated, router]);

  return (
    <>
      {trigger ? (
        <span onClick={() => setOpen(true)}>{trigger}</span>
      ) : (
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4" aria-hidden />
          New customer
        </Button>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit customer" : "New customer"}
        description={
          editing
            ? "Changes apply to the portal account immediately."
            : "For someone renting at the counter. They can sign in later using the password reset flow."
        }
      >
        <form action={formAction} className="space-y-5">
          {initial?.id && <input type="hidden" name="id" value={initial.id} />}

          {state.error && <Alert tone="error">{state.error}</Alert>}

          <ImageUpload
            name="imageUrl"
            defaultValue={initial?.imageUrl ?? ""}
            label="Photo"
            shape="circle"
            maxDimension={512}
            hint="Optional."
          />

          <Input
            label="Full name"
            name="name"
            defaultValue={initial?.name}
            required
            autoFocus
          />

          <FieldRow>
            <Input
              label="Email address"
              name="email"
              type="email"
              defaultValue={initial?.email}
              required
              hint="Used to sign in to the portal."
            />
            <Input
              label="Phone number"
              name="phone"
              type="tel"
              defaultValue={initial?.phone}
              placeholder="+91 98765 43210"
            />
          </FieldRow>

          <Input
            label={editing ? "New password" : "Password"}
            name="password"
            type="password"
            hint={
              editing
                ? "Leave blank to keep the current password."
                : "Leave blank to generate one. The customer resets it from the portal."
            }
          />

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isPending}>
              {editing ? "Save changes" : "Create customer"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
