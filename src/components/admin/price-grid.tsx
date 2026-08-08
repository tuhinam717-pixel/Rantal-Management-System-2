"use client";

import { useActionState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DataTable, TableRow } from "@/components/ui/data-table";
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
  periods: { id: string; name: string; unit: string }[];
  prices: Record<string, number>;
}) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    savePriceGridAction,
    {}
  );

  const columns = [
    { key: "product", label: "Product" },
    ...periods.map((p) => ({
      key: p.id,
      label: p.name,
      align: "right" as const,
    })),
  ];

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="pricelistId" value={pricelistId} />

      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.ok && <Alert tone="success">Rates saved.</Alert>}

      <DataTable columns={columns} minWidth="52rem">
        {products.map((product) => (
          <TableRow key={product.id}>
            <td className="px-4 py-2">
              <p className="font-medium text-ink-900">{product.name}</p>
              <p className="font-mono text-xs text-ink-500">{product.sku}</p>
            </td>

            {periods.map((period) => {
              const key = `${product.id}_${period.id}`;
              const value = prices[key];

              return (
                <td key={period.id} className="px-3 py-2">
                  {/*
                    Right-aligned tabular numerals with a fixed width: money
                    columns only read as columns when the digits line up.
                  */}
                  <div className="relative ml-auto w-32">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-400">
                      ₹
                    </span>
                    <input
                      name={`cell_${key}`}
                      type="number"
                      min={0}
                      step={10}
                      defaultValue={value ?? ""}
                      placeholder="—"
                      aria-label={`${product.name} — ${period.name} rate`}
                      className="block w-full rounded-xl border-0 bg-surface py-2 pl-7 pr-3 text-right text-sm tabular-nums text-ink-900 shadow-sm ring-1 ring-inset ring-line transition-shadow placeholder:text-ink-400 hover:ring-brand-300 focus:ring-2 focus:ring-inset focus:ring-brand-600 focus:outline-none"
                    />
                  </div>
                </td>
              );
            })}
          </TableRow>
        ))}
      </DataTable>

      <Button type="submit" isLoading={isPending}>
        Save rates
      </Button>
    </form>
  );
}
