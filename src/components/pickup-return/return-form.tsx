"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { processReturnAction } from "@/app/(admin)/admin/actions";
import { cn, formatCurrency } from "@/lib/utils";

const CONDITIONS = [
  { value: "GOOD", label: "Good" },
  { value: "DAMAGED", label: "Damaged" },
  { value: "MISSING_ACCESSORIES", label: "Missing parts" },
  { value: "UNUSABLE", label: "Unusable" },
] as const;

/**
 * Receives a return. The penalty preview is computed server-side and passed in
 * as `estimatedPenalty`; any damage charge entered here is deducted on top.
 */
export function ReturnForm({
  orderId,
  productId,
  depositAmount,
  estimatedPenalty,
}: {
  orderId: string;
  productId: string;
  depositAmount: number;
  estimatedPenalty: number;
}) {
  const [condition, setCondition] = useState<string>("GOOD");
  const [damageCharge, setDamageCharge] = useState(0);
  const [open, setOpen] = useState(false);

  const totalDeduction = Math.min(
    depositAmount,
    estimatedPenalty + (Number.isFinite(damageCharge) ? damageCharge : 0)
  );
  const refund = Math.max(0, depositAmount - totalDeduction);
  const needsDetail = condition !== "GOOD";

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        Receive return
      </Button>
    );
  }

  return (
    <form
      action={processReturnAction}
      className="mt-4 w-full space-y-4 rounded-lg bg-slate-50 p-4 ring-1 ring-inset ring-slate-200"
    >
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="condition" value={condition} />

      <div>
        <span className="mb-2 block text-xs font-medium text-ink-700">
          Condition on return
        </span>
        <div className="flex flex-wrap gap-2">
          {CONDITIONS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCondition(c.value)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                condition === c.value
                  ? "bg-brand-600 text-white"
                  : "bg-white text-ink-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {needsDetail && (
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-700">
              What is wrong with it?
            </span>
            <textarea
              name="damageNote"
              rows={2}
              className="block w-full rounded-lg border-0 bg-white py-2 pl-2.5 text-sm shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-brand-600"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-700">
              Missing accessories
            </span>
            <input
              name="missingAccessories"
              className="block w-full rounded-lg border-0 bg-white py-2 pl-2.5 text-sm shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-brand-600"
            />
          </label>

          <label className="block max-w-40">
            <span className="mb-1 block text-xs font-medium text-ink-700">
              Damage charge
            </span>
            <input
              name="damageCharge"
              type="number"
              min={0}
              step={100}
              value={damageCharge}
              onChange={(e) => setDamageCharge(Number(e.target.value))}
              className="block w-full rounded-lg border-0 bg-white py-2 pl-2.5 text-sm shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-brand-600"
            />
          </label>
        </div>
      )}

      <dl className="space-y-1.5 border-t border-slate-200 pt-3 text-xs">
        <div className="flex justify-between">
          <dt className="text-ink-500">Deposit held</dt>
          <dd className="font-medium text-ink-900">
            {formatCurrency(depositAmount)}
          </dd>
        </div>
        {estimatedPenalty > 0 && (
          <div className="flex justify-between">
            <dt className="text-ink-500">Late return penalty</dt>
            <dd className="font-medium text-red-600">
              -{formatCurrency(estimatedPenalty)}
            </dd>
          </div>
        )}
        {damageCharge > 0 && (
          <div className="flex justify-between">
            <dt className="text-ink-500">Damage charge</dt>
            <dd className="font-medium text-red-600">
              -{formatCurrency(damageCharge)}
            </dd>
          </div>
        )}
        <div className="flex justify-between border-t border-slate-200 pt-1.5">
          <dt className="font-medium text-ink-900">Refund to customer</dt>
          <dd className="font-semibold text-emerald-600">
            {formatCurrency(refund)}
          </dd>
        </div>
      </dl>

      <div className="flex gap-2">
        <Button type="submit" size="sm">
          Confirm return and settle
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
