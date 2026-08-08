"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldRow } from "@/components/ui/form-shell";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/field";
import {
  saveVendorAction,
  type FormState,
} from "@/app/(admin)/admin/vendors/actions";

export interface VendorInitial {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  gstin: string;
  addressLine: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  paymentTermsDays: number;
  notes: string;
}

export function VendorDialog({
  initial,
  trigger,
}: {
  initial?: VendorInitial;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    saveVendorAction,
    {}
  );

  const editing = Boolean(initial?.id);

  useEffect(() => {
    if (state.ok && open) {
      setOpen(false);
      router.refresh();
    }
  }, [state.ok, open, router]);

  return (
    <>
      {trigger ? (
        <span onClick={() => setOpen(true)}>{trigger}</span>
      ) : (
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4" aria-hidden />
          New vendor
        </Button>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit vendor" : "New vendor"}
        description="A supplier you buy or lease rental stock from, and who may handle repairs."
        size="lg"
      >
        <form action={formAction} className="space-y-5">
          {initial?.id && <input type="hidden" name="id" value={initial.id} />}
          <input type="hidden" name="isActive" value="true" />

          {state.error && <Alert tone="error">{state.error}</Alert>}

          <Input
            label="Vendor name"
            name="name"
            defaultValue={initial?.name}
            placeholder="Sunrise Camera Supply"
            required
            autoFocus
          />

          <FieldRow>
            <Input
              label="Contact person"
              name="contactPerson"
              defaultValue={initial?.contactPerson}
              placeholder="Priya Nair"
            />
            <Input
              label="GSTIN"
              name="gstin"
              defaultValue={initial?.gstin}
              placeholder="27AAAPA1234A1Z5"
            />
          </FieldRow>

          <FieldRow>
            <Input
              label="Email"
              name="email"
              type="email"
              defaultValue={initial?.email}
            />
            <Input
              label="Phone"
              name="phone"
              type="tel"
              defaultValue={initial?.phone}
              placeholder="+91 98765 43210"
            />
          </FieldRow>

          <Input
            label="Address"
            name="addressLine"
            defaultValue={initial?.addressLine}
            placeholder="Unit 4, Andheri Industrial Estate"
          />

          <FieldRow>
            <Input label="City" name="city" defaultValue={initial?.city} />
            <Input label="State" name="state" defaultValue={initial?.state} />
          </FieldRow>

          <FieldRow>
            <Input
              label="Postcode"
              name="postalCode"
              defaultValue={initial?.postalCode}
            />
            <Input
              label="Payment terms (days)"
              name="paymentTermsDays"
              type="number"
              min={0}
              max={365}
              defaultValue={initial?.paymentTermsDays ?? 30}
              hint="How long you have to settle their invoices."
            />
          </FieldRow>

          <Textarea
            label="Notes"
            name="notes"
            rows={2}
            defaultValue={initial?.notes}
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
              {editing ? "Save changes" : "Create vendor"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
