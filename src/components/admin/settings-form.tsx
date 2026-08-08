"use client";

import { useActionState, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  saveSettingsAction,
  type FormState,
} from "@/app/(admin)/admin/config-actions";
import { cn } from "@/lib/utils";

export function SettingsForm({
  initial,
}: {
  initial: {
    companyName: string;
    currency: string;
    defaultDepositType: "FIXED" | "PERCENTAGE";
    defaultDepositValue: number;
    defaultGraceHours: number;
    quotationValidDays: number;
  };
}) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    saveSettingsAction,
    {}
  );
  const [depositType, setDepositType] = useState(initial.defaultDepositType);

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.ok && <Alert tone="success">Settings saved.</Alert>}

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-ink-900">Organisation</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Input
            label="Company name"
            name="companyName"
            defaultValue={initial.companyName}
            hint="Shown on invoices."
            required
          />
          <Input
            label="Currency"
            name="currency"
            defaultValue={initial.currency}
            maxLength={3}
            hint="Three-letter code, e.g. INR."
            required
          />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-ink-900">
          Default security deposit
        </h2>
        <p className="mt-1 text-xs text-ink-500">
          Used when a product does not define its own deposit.
        </p>

        <div className="mt-4 flex gap-2">
          {(["FIXED", "PERCENTAGE"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setDepositType(type)}
              className={cn(
                "rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
                depositType === type
                  ? "bg-brand-600 text-white"
                  : "bg-white text-ink-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
              )}
            >
              {type === "FIXED" ? "Fixed amount" : "Percentage of rent"}
            </button>
          ))}
        </div>
        <input type="hidden" name="defaultDepositType" value={depositType} />

        <div className="mt-4 max-w-56">
          <Input
            label={depositType === "FIXED" ? "Amount" : "Percentage"}
            name="defaultDepositValue"
            type="number"
            min={0}
            defaultValue={initial.defaultDepositValue}
            required
          />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-ink-900">Rental policy</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Input
            label="Grace period (hours)"
            name="defaultGraceHours"
            type="number"
            min={0}
            defaultValue={initial.defaultGraceHours}
            hint="Late time inside this window is not charged."
            required
          />
          <Input
            label="Quotation validity (days)"
            name="quotationValidDays"
            type="number"
            min={1}
            defaultValue={initial.quotationValidDays}
            required
          />
        </div>
      </section>

      <Button type="submit" isLoading={isPending}>
        Save settings
      </Button>
    </form>
  );
}
