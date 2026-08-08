"use client";

import { Input } from "@/components/ui/input";
import { FieldRow } from "@/components/ui/form-shell";
import type { AddressVM } from "@/types";

/**
 * The address field set, shared by the profile address book and the
 * add-address dialog at checkout, so the two can't drift apart.
 */
export function AddressFields({
  initial,
  defaultChecked,
  showDefaultToggle = true,
}: {
  initial?: AddressVM;
  defaultChecked?: boolean;
  showDefaultToggle?: boolean;
}) {
  return (
    <>
      <Input
        label="Label"
        name="label"
        defaultValue={initial?.label ?? ""}
        placeholder="Home, Office, Site"
      />

      <Input
        label="Address line 1"
        name="line1"
        defaultValue={initial?.line1}
        placeholder="Flat / building / street"
        required
      />

      <Input
        label="Address line 2"
        name="line2"
        defaultValue={initial?.line2 ?? ""}
        placeholder="Area, landmark"
      />

      <FieldRow cols={3}>
        <Input label="City" name="city" defaultValue={initial?.city} required />
        <Input label="State" name="state" defaultValue={initial?.state} required />
        <Input
          label="Postcode"
          name="postalCode"
          defaultValue={initial?.postalCode}
          inputMode="numeric"
          required
        />
      </FieldRow>

      <Input
        label="Country"
        name="country"
        defaultValue={initial?.country ?? "India"}
      />

      {showDefaultToggle && (
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-canvas p-3.5 transition-colors hover:border-brand-300">
          <input
            type="checkbox"
            name="isDefault"
            value="true"
            defaultChecked={defaultChecked ?? initial?.isDefault ?? false}
            className="mt-0.5 size-4 rounded border-line text-brand-600 focus:ring-brand-600"
          />
          <span>
            <span className="block text-sm font-medium text-ink-900">
              Use as my default delivery address
            </span>
            <span className="block text-xs text-ink-500">
              Pre-selected at checkout.
            </span>
          </span>
        </label>
      )}
    </>
  );
}
