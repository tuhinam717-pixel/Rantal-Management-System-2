"use client";

import { useActionState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldRow } from "@/components/ui/form-shell";
import { Input } from "@/components/ui/input";
import {
  updateVendorProfileAction,
  type FormState,
} from "@/app/(vendor)/vendor/actions";

export function VendorProfileForm({
  initial,
}: {
  initial: {
    contactPerson: string;
    phone: string;
    gstin: string;
    addressLine: string;
    city: string;
    state: string;
    postalCode: string;
  };
}) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    updateVendorProfileAction,
    {}
  );

  return (
    <form action={formAction} className="space-y-5">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.ok && <Alert tone="success">Details updated.</Alert>}

      <FieldRow>
        <Input
          label="Contact person"
          name="contactPerson"
          defaultValue={initial.contactPerson}
          placeholder="Priya Nair"
        />
        <Input
          label="Phone"
          name="phone"
          type="tel"
          defaultValue={initial.phone}
          placeholder="+91 98765 43210"
        />
      </FieldRow>

      <Input
        label="GSTIN"
        name="gstin"
        defaultValue={initial.gstin}
        placeholder="27AAAPA1234A1Z5"
        hint="Printed on purchase paperwork."
      />

      <Input
        label="Address"
        name="addressLine"
        defaultValue={initial.addressLine}
        placeholder="Unit 4, Andheri Industrial Estate"
      />

      <FieldRow>
        <Input label="City" name="city" defaultValue={initial.city} />
        <Input label="State" name="state" defaultValue={initial.state} />
      </FieldRow>

      <Input
        label="Postcode"
        name="postalCode"
        defaultValue={initial.postalCode}
        className="max-w-40"
      />

      <Button type="submit" isLoading={isPending}>
        Save details
      </Button>
    </form>
  );
}
