"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DeleteButton } from "@/components/admin/delete-button";
import {
  createVariantAction,
  deleteVariantAction,
  type FormState,
} from "@/app/(admin)/admin/products/actions";

interface Variant {
  id: string;
  sku: string;
  brand: string | null;
  manufacturer: string | null;
  color: string | null;
  size: string | null;
  stock: number;
}

/** Variant axes named in the brief: Brand, Manufacturer, Color, Size. */
export function VariantManager({
  productId,
  variants,
}: {
  productId: string;
  variants: Variant[];
}) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    createVariantAction,
    {}
  );

  const cell =
    "block w-full rounded-lg border-0 bg-white py-2 pl-2.5 text-sm shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-brand-600";

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-ink-900">Variants</h2>
      <p className="mt-1 text-xs text-ink-500">
        Brand, manufacturer, colour and size combinations held under this
        product.
      </p>

      {state.error && (
        <Alert tone="error" className="mt-3">
          {state.error}
        </Alert>
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[48rem] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-ink-500">
              <th className="py-2 pr-3 font-medium">SKU</th>
              <th className="py-2 pr-3 font-medium">Brand</th>
              <th className="py-2 pr-3 font-medium">Manufacturer</th>
              <th className="py-2 pr-3 font-medium">Colour</th>
              <th className="py-2 pr-3 font-medium">Size</th>
              <th className="py-2 pr-3 text-right font-medium">Stock</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {variants.map((variant) => (
              <tr key={variant.id}>
                <td className="py-2 pr-3 font-mono text-xs text-ink-700">
                  {variant.sku}
                </td>
                <td className="py-2 pr-3 text-ink-700">{variant.brand ?? "—"}</td>
                <td className="py-2 pr-3 text-ink-700">
                  {variant.manufacturer ?? "—"}
                </td>
                <td className="py-2 pr-3 text-ink-700">{variant.color ?? "—"}</td>
                <td className="py-2 pr-3 text-ink-700">{variant.size ?? "—"}</td>
                <td className="py-2 pr-3 text-right text-ink-900">
                  {variant.stock}
                </td>
                <td className="py-2 text-right">
                  <form action={deleteVariantAction}>
                    <input type="hidden" name="id" value={variant.id} />
                    <input type="hidden" name="productId" value={productId} />
                    <DeleteButton
                      label=""
                      confirmMessage={`Delete variant ${variant.sku}?`}
                    />
                  </form>
                </td>
              </tr>
            ))}

            {/* Inline "add" row so a variant is one form submit away. */}
            <tr>
              <td colSpan={7} className="pt-4">
                <form action={formAction} className="grid gap-2 sm:grid-cols-7">
                  <input type="hidden" name="productId" value={productId} />
                  <input name="sku" placeholder="SKU" required className={cell} />
                  <input name="brand" placeholder="Brand" className={cell} />
                  <input
                    name="manufacturer"
                    placeholder="Manufacturer"
                    className={cell}
                  />
                  <input name="color" placeholder="Colour" className={cell} />
                  <input name="size" placeholder="Size" className={cell} />
                  <input
                    name="stock"
                    type="number"
                    min={0}
                    defaultValue={0}
                    className={cell}
                  />
                  <Button type="submit" size="sm" isLoading={isPending}>
                    {!isPending && <Plus className="size-4" aria-hidden />}
                    Add
                  </Button>
                </form>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
