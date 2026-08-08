"use client";

import { useActionState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  savePriceGridAction,
  type FormState,
} from "@/app/(admin)/admin/config-actions";

/**
 * Editable product x rental-period rate grid for a single pricelist.
 * A blank cell means "this product isn't offered for that period".
 */
export function PriceGrid({
  pricelistId,
  products,
  periods,
  prices,
}: {
  pricelistId: string;
  products: { id: string; name: string; sku: string }[];
  periods: { id: string; name: string }[];
  prices: Record<string, number>;
}) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    savePriceGridAction,
    {}
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="pricelistId" value={pricelistId} />

      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.ok && <Alert tone="success">Rates saved.</Alert>}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[48rem] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-ink-500">
              <th className="px-4 py-3 font-medium">Product</th>
              {periods.map((period) => (
                <th key={period.id} className="px-3 py-3 text-right font-medium">
                  {period.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.map((product) => (
              <tr key={product.id}>
                <td className="px-4 py-2">
                  <p className="font-medium text-ink-900">{product.name}</p>
                  <p className="font-mono text-xs text-ink-500">{product.sku}</p>
                </td>
                {periods.map((period) => {
                  const key = `${product.id}_${period.id}`;
                  const value = prices[key];

                  return (
                    <td key={period.id} className="px-3 py-2">
                      <input
                        name={`cell_${key}`}
                        type="number"
                        min={0}
                        step={10}
                        defaultValue={value ?? ""}
                        placeholder="—"
                        className="block w-28 rounded-lg border-0 bg-white py-1.5 pl-2.5 text-right text-sm shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-brand-600"
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Button type="submit" isLoading={isPending}>
        Save rates
      </Button>
    </form>
  );
}
