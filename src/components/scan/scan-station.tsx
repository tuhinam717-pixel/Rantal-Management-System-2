"use client";

import { useCallback, useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  PackageCheck,
  RotateCcw,
  Undo2,
} from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DateRange } from "@/components/ui/date-range";
import { AffixInput, Select, Textarea } from "@/components/ui/field";
import { StatusBadge } from "@/components/orders/status-badge";
import { CodeScanner } from "@/components/scan/code-scanner";
import {
  lookupScanAction,
  scanConfirmPickupAction,
  scanProcessReturnAction,
  type ScanResult,
} from "@/app/(admin)/admin/scan/actions";
import { cn, formatCurrency } from "@/lib/utils";
import type { ItemCondition, OrderStatus } from "@/types";

const CONDITIONS: { value: ItemCondition; label: string }[] = [
  { value: "GOOD", label: "Good" },
  { value: "DAMAGED", label: "Damaged" },
  { value: "MISSING_ACCESSORIES", label: "Missing parts" },
  { value: "UNUSABLE", label: "Unusable" },
];

export function ScanStation() {
  const [result, setResult] = useState<ScanResult | null>(null);
  const [isPending, startTransition] = useTransition();

  // Return inspection inputs, only used when the next action is a return.
  const [condition, setCondition] = useState<ItemCondition>("GOOD");
  const [damageCharge, setDamageCharge] = useState(0);
  const [damageNote, setDamageNote] = useState("");
  const [missing, setMissing] = useState("");

  const reset = useCallback(() => {
    setResult(null);
    setCondition("GOOD");
    setDamageCharge(0);
    setDamageNote("");
    setMissing("");
  }, []);

  const handleCode = useCallback((code: string) => {
    startTransition(async () => setResult(await lookupScanAction(code)));
  }, []);

  const order = result?.order;

  function confirmPickup() {
    if (!order) return;
    startTransition(async () => setResult(await scanConfirmPickupAction(order.id)));
  }

  function receiveReturn() {
    if (!order) return;
    startTransition(async () =>
      setResult(
        await scanProcessReturnAction({
          orderId: order.id,
          productId: order.firstProductId,
          condition,
          damageNote,
          missingAccessories: missing,
          damageCharge,
        })
      )
    );
  }

  const totalDeduction = order
    ? Math.min(order.depositAmount, order.penaltyAmount + damageCharge)
    : 0;
  const refund = order ? Math.max(0, order.depositAmount - totalDeduction) : 0;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="h-fit p-5">
        <h2 className="text-sm font-semibold text-ink-900">1. Scan the order</h2>
        <p className="mt-1 mb-4 text-xs text-ink-500">
          The QR is on the customer&apos;s order page and invoice.
        </p>

        <CodeScanner onCode={handleCode} isBusy={isPending} />
      </Card>

      <div className="space-y-4">
        {!result && (
          <Card className="grid min-h-64 place-items-center p-8 text-center">
            <div>
              <p className="text-sm font-medium text-ink-900">
                Nothing scanned yet
              </p>
              <p className="mt-1 text-sm text-ink-500">
                Scan a code and the order appears here with the action that
                comes next.
              </p>
            </div>
          </Card>
        )}

        {result?.error && <Alert tone="error">{result.error}</Alert>}
        {result?.done && <Alert tone="success">{result.done}</Alert>}

        {order && (
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/admin/orders/${order.id}`}
                  className="text-lg font-semibold text-brand-700 hover:text-brand-800"
                >
                  {order.number}
                </Link>
                <StatusBadge status={order.status as OrderStatus} />
              </div>

              <Button variant="ghost" size="sm" onClick={reset}>
                <RotateCcw className="size-4" aria-hidden />
                Scan another
              </Button>
            </div>

            <p className="mt-3 text-sm font-medium text-ink-900">
              {order.customerName}
            </p>
            {order.customerPhone && (
              <p className="text-xs text-ink-500">{order.customerPhone}</p>
            )}
            <p className="mt-2 text-xs text-ink-500">{order.items}</p>
            <DateRange
              from={order.rentalStart}
              to={order.rentalEnd}
              className="mt-2 text-xs text-ink-500"
            />

            <div className="mt-5 border-t border-line pt-4">
              <h3 className="text-sm font-semibold text-ink-900">
                2. {order.nextAction === "PICKUP"
                  ? "Hand over the product"
                  : order.nextAction === "RETURN"
                    ? "Receive the product back"
                    : "Nothing left to do"}
              </h3>

              {order.nextAction === "PICKUP" && (
                <div className="mt-3">
                  <p className="text-xs text-ink-500">
                    Deposit of {formatCurrency(order.depositAmount)} is already
                    held. Confirming marks the rental as picked up.
                  </p>
                  <Button
                    size="lg"
                    className="mt-3 w-full"
                    onClick={confirmPickup}
                    isLoading={isPending}
                  >
                    {!isPending && <PackageCheck className="size-4" aria-hidden />}
                    Confirm pickup
                  </Button>
                </div>
              )}

              {order.nextAction === "RETURN" && (
                <div className="mt-3 space-y-4">
                  {order.penaltyAmount > 0 && (
                    <p className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600">
                      <AlertTriangle className="size-3.5" aria-hidden />
                      {order.penaltyUnits} {order.penaltyUnit.toLowerCase()}
                      {order.penaltyUnits === 1 ? "" : "s"} overdue
                    </p>
                  )}

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
                          aria-pressed={condition === c.value}
                          className={cn(
                            "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                            condition === c.value
                              ? "bg-brand-600 text-white"
                              : "bg-surface text-ink-700 ring-1 ring-inset ring-line hover:bg-brand-50"
                          )}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {condition !== "GOOD" && (
                    <div className="space-y-3">
                      <Textarea
                        label="What is wrong with it?"
                        rows={2}
                        value={damageNote}
                        onChange={(e) => setDamageNote(e.target.value)}
                      />
                      <Select
                        label="Missing accessories"
                        value={missing}
                        onChange={(e) => setMissing(e.target.value)}
                      >
                        <option value="">None</option>
                        <option value="Charger">Charger</option>
                        <option value="Battery">Battery</option>
                        <option value="Case">Case</option>
                        <option value="Cables">Cables</option>
                      </Select>
                      <div className="max-w-40">
                        <AffixInput
                          label="Damage charge"
                          type="number"
                          min={0}
                          step={100}
                          prefix="₹"
                          value={damageCharge}
                          onChange={(e) => setDamageCharge(Number(e.target.value))}
                        />
                      </div>
                    </div>
                  )}

                  <dl className="space-y-1.5 rounded-xl bg-brand-50 p-3.5 text-xs ring-1 ring-inset ring-brand-200">
                    <div className="flex justify-between">
                      <dt className="text-ink-500">Deposit held</dt>
                      <dd className="font-medium text-ink-900">
                        {formatCurrency(order.depositAmount)}
                      </dd>
                    </div>
                    {order.penaltyAmount > 0 && (
                      <div className="flex justify-between">
                        <dt className="text-ink-500">Late penalty</dt>
                        <dd className="font-medium text-red-600">
                          -{formatCurrency(order.penaltyAmount)}
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
                    <div className="flex justify-between border-t border-brand-300 pt-1.5">
                      <dt className="font-medium text-ink-900">
                        Refund to customer
                      </dt>
                      <dd className="font-semibold text-emerald-700">
                        {formatCurrency(refund)}
                      </dd>
                    </div>
                  </dl>

                  <Button
                    size="lg"
                    className="w-full"
                    onClick={receiveReturn}
                    isLoading={isPending}
                  >
                    {!isPending && <Undo2 className="size-4" aria-hidden />}
                    Confirm return and settle
                  </Button>
                </div>
              )}

              {order.nextAction === "NONE" && (
                <div className="mt-3 flex items-start gap-2.5 rounded-xl bg-emerald-50 p-3.5 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-200">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <span>
                    This rental is fully settled — picked up, returned and the
                    deposit closed out.
                  </span>
                </div>
              )}
            </div>

            <Link
              href={`/admin/orders/${order.id}`}
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-800"
            >
              Open full order
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Card>
        )}
      </div>
    </div>
  );
}
