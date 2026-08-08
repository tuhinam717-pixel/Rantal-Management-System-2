"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select, Textarea } from "@/components/ui/field";
import { FieldRow } from "@/components/ui/form-shell";
import {
  createQuotationAction,
  type FormState,
} from "@/app/(admin)/admin/quotations/actions";
import { billableUnits, formatDuration, lineRent } from "@/lib/rental/pricing";
import { formatCurrency } from "@/lib/utils";
import type { RentalUnit } from "@/types";

interface ProductOption {
  id: string;
  name: string;
  depositType: "FIXED" | "PERCENTAGE";
  depositValue: number;
  rates: { rentalPeriodId: string; price: number }[];
}

function toLocalInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function QuotationBuilder({
  customers,
  products,
  periods,
}: {
  customers: { id: string; name: string; email: string }[];
  products: ProductOption[];
  periods: { id: string; name: string; unit: RentalUnit; duration: number }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    createQuotationAction,
    {}
  );

  useEffect(() => {
    if (state.ok && open) {
      setOpen(false);
      router.refresh();
    }
  }, [state.ok, open, router]);

  const defaults = useMemo(() => {
    const start = new Date();
    start.setHours(10, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 3);
    return { start: toLocalInput(start), end: toLocalInput(end) };
  }, []);

  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [periodId, setPeriodId] = useState(
    periods.find((p) => p.unit === "DAY")?.id ?? periods[0]?.id ?? ""
  );
  const [quantity, setQuantity] = useState(1);
  const [start, setStart] = useState(defaults.start);
  const [end, setEnd] = useState(defaults.end);

  const product = products.find((p) => p.id === productId);
  const period = periods.find((p) => p.id === periodId);
  const rate = product?.rates.find((r) => r.rentalPeriodId === periodId)?.price;

  const quote = useMemo(() => {
    if (!product || !period || rate == null) return null;

    const s = new Date(start);
    const e = new Date(end);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e <= s) return null;

    const units = billableUnits(s, e, period.unit, period.duration);
    const rent = lineRent(rate, units, quantity);
    const deposit =
      product.depositType === "PERCENTAGE"
        ? (rent * product.depositValue) / 100
        : product.depositValue * quantity;

    return { units, rent, deposit };
  }, [product, period, rate, start, end, quantity]);

  const dateClass =
    "block w-full rounded-xl border-0 bg-surface py-2.5 pl-3.5 text-sm text-ink-900 shadow-sm ring-1 ring-inset ring-line hover:ring-brand-300 focus:ring-2 focus:ring-inset focus:ring-brand-600 focus:outline-none";

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" aria-hidden />
        New quotation
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New quotation"
        description="For a walk-in customer. Rates come from the active pricelist."
        size="lg"
      >
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="rentalStart" value={start} />
      <input type="hidden" name="rentalEnd" value={end} />

      {state.error && <Alert tone="error">{state.error}</Alert>}

      <Select label="Customer" name="customerId" required>
        {customers.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} ({c.email})
          </option>
        ))}
      </Select>

      <Select
        label="Product"
        name="productId"
        value={productId}
        onChange={(e) => setProductId(e.target.value)}
        required
      >
        {products.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </Select>

      <FieldRow>
        <Select
          label="Rental period"
          name="rentalPeriodId"
          value={periodId}
          onChange={(e) => setPeriodId(e.target.value)}
          required
        >
          {periods.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>

        <Input
          label="Quantity"
          name="quantity"
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          required
        />
      </FieldRow>

      <FieldRow>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink-700">
            Starts
          </span>
          <input
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className={dateClass}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink-700">
            Returns
          </span>
          <input
            type="datetime-local"
            value={end}
            min={start}
            onChange={(e) => setEnd(e.target.value)}
            className={dateClass}
          />
        </label>
      </FieldRow>

      <Textarea label="Notes" name="notes" rows={2} />

      <div className="rounded-xl bg-brand-50 p-4 ring-1 ring-inset ring-brand-200">
        {quote && period ? (
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between text-ink-500">
              <dt>Duration</dt>
              <dd>{formatDuration(quote.units, period.unit)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-700">Rent</dt>
              <dd className="font-medium text-ink-900">
                {formatCurrency(quote.rent)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-700">Security deposit</dt>
              <dd className="font-medium text-ink-900">
                {formatCurrency(quote.deposit)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-brand-300 pt-2">
              <dt className="font-medium text-ink-900">Quotation total</dt>
              <dd className="text-base font-semibold text-ink-900">
                {formatCurrency(quote.rent + quote.deposit)}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-ink-500">
            {rate == null
              ? "This product has no rate for the selected rental period."
              : "Choose valid dates to see the total."}
          </p>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button
          type="button"
          variant="secondary"
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
        <Button type="submit" isLoading={isPending} disabled={!quote}>
          Create quotation
        </Button>
      </div>
    </form>
      </Modal>
    </>
  );
}
