"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, ShoppingCart } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { addToCartAction } from "@/app/(portal)/cart/actions";
import { billableUnits, formatDuration, lineRent } from "@/lib/rental/pricing";
import { cn, formatCurrency } from "@/lib/utils";
import type { RentalPeriodVM } from "@/types";

/** `datetime-local` wants "YYYY-MM-DDTHH:mm" in local time, not an ISO string. */
function toLocalInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function RentalConfigurator({
  productId,
  periods,
  depositPerItem,
  available,
}: {
  productId: string;
  periods: RentalPeriodVM[];
  depositPerItem: number;
  available: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Default to a 3-day rental starting tomorrow — a sensible, editable start.
  const defaults = useMemo(() => {
    const start = new Date();
    start.setDate(start.getDate() + 1);
    start.setHours(10, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 3);
    return { start: toLocalInput(start), end: toLocalInput(end) };
  }, []);

  const [periodId, setPeriodId] = useState(
    periods.find((p) => p.unit === "DAY")?.id ?? periods[0]?.id ?? ""
  );
  const [start, setStart] = useState(defaults.start);
  const [end, setEnd] = useState(defaults.end);
  const [quantity, setQuantity] = useState(1);

  const period = periods.find((p) => p.id === periodId);

  const quote = useMemo(() => {
    if (!period) return null;
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime()) ||
      endDate <= startDate
    ) {
      return null;
    }

    const units = billableUnits(startDate, endDate, period.unit, period.duration);
    const rent = lineRent(period.price, units, quantity);

    return { units, rent, deposit: depositPerItem * quantity };
  }, [period, start, end, quantity, depositPerItem]);

  const soldOut = available === 0;

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await addToCartAction(formData);
      if (result.ok) {
        router.push("/cart");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form action={submit} className="space-y-5">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="rentalStart" value={start} />
      <input type="hidden" name="rentalEnd" value={end} />

      {error && <Alert tone="error">{error}</Alert>}

      <div>
        <span className="mb-2 block text-sm font-medium text-ink-700">
          Rental period
        </span>
        <div className="grid grid-cols-2 gap-2">
          {periods.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriodId(p.id)}
              className={cn(
                "rounded-lg border px-3 py-2.5 text-left transition-colors",
                p.id === periodId
                  ? "border-brand-600 bg-brand-50 ring-1 ring-brand-600"
                  : "border-slate-200 bg-white hover:border-slate-300"
              )}
            >
              <span className="block text-sm font-medium text-ink-900">
                {p.name}
              </span>
              <span className="block text-xs text-ink-500">
                {formatCurrency(p.price)}
              </span>
            </button>
          ))}
        </div>
        <input type="hidden" name="rentalPeriodId" value={periodId} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink-700">
            Starts
          </span>
          <input
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="block w-full rounded-lg border-0 bg-white py-2.5 pl-3 text-sm text-ink-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-brand-600"
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
            className="block w-full rounded-lg border-0 bg-white py-2.5 pl-3 text-sm text-ink-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-brand-600"
          />
        </label>
      </div>

      <label className="block max-w-32">
        <span className="mb-1.5 block text-sm font-medium text-ink-700">
          Quantity
        </span>
        <input
          type="number"
          name="quantity"
          min={1}
          max={Math.max(1, available)}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          className="block w-full rounded-lg border-0 bg-white py-2.5 pl-3 text-sm text-ink-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-brand-600"
        />
      </label>

      {/* Rent and deposit are shown separately, never merged into one number. */}
      <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-200">
        {quote && period ? (
          <dl className="space-y-2 text-sm">
            <div className="flex items-center justify-between text-ink-500">
              <dt className="flex items-center gap-1.5">
                <CalendarDays className="size-4" aria-hidden />
                Duration
              </dt>
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
            <div className="flex justify-between border-t border-slate-200 pt-2">
              <dt className="font-medium text-ink-900">Payable now</dt>
              <dd className="text-base font-semibold text-ink-900">
                {formatCurrency(quote.rent + quote.deposit)}
              </dd>
            </div>
            <p className="pt-1 text-xs text-ink-500">
              The deposit is refunded in full when the product is returned on
              time.
            </p>
          </dl>
        ) : (
          <p className="text-sm text-ink-500">
            Choose a start and return date to see the price.
          </p>
        )}
      </div>

      <Button
        type="submit"
        size="lg"
        className="w-full"
        isLoading={isPending}
        disabled={soldOut || !quote}
      >
        {!isPending && <ShoppingCart className="size-4" aria-hidden />}
        {soldOut ? "Out of stock" : "Add to cart"}
      </Button>
    </form>
  );
}
