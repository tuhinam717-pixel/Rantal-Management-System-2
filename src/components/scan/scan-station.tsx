"use client";

import { useCallback, useState, useTransition } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, RotateCcw } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DateRange } from "@/components/ui/date-range";
import { StatusBadge } from "@/components/orders/status-badge";
import { CodeScanner } from "@/components/scan/code-scanner";
import { ReturnForm } from "@/components/pickup-return/return-form";
import { confirmPickupAction } from "@/app/(admin)/admin/actions";
import { lookupScanAction, type ScanResult } from "@/app/(admin)/admin/scan/actions";
import { formatCurrency } from "@/lib/utils";
import type { OrderStatus } from "@/types";

export function ScanStation() {
  const [result, setResult] = useState<ScanResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleCode = useCallback((code: string) => {
    startTransition(async () => {
      setResult(await lookupScanAction(code));
    });
  }, []);

  const order = result?.order;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="p-5">
        <h2 className="text-sm font-semibold text-ink-900">Scan</h2>
        <p className="mt-1 mb-4 text-xs text-ink-500">
          Scan the QR on the customer&apos;s invoice or order page to jump
          straight to the pickup or return.
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
                The order will appear here with its next action.
              </p>
            </div>
          </Card>
        )}

        {result?.error && <Alert tone="error">{result.error}</Alert>}

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

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setResult(null)}
              >
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

            <dl className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-3">
              <div>
                <dt className="text-xs text-ink-500">Deposit held</dt>
                <dd className="text-sm font-semibold text-ink-900">
                  {formatCurrency(order.depositAmount)}
                </dd>
              </div>
              {order.penaltyAmount > 0 && (
                <div className="text-right">
                  <dt className="text-xs text-ink-500">Late penalty</dt>
                  <dd className="text-sm font-semibold text-red-600">
                    {formatCurrency(order.penaltyAmount)}
                  </dd>
                </div>
              )}
            </dl>

            {order.penaltyAmount > 0 && (
              <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-red-600">
                <AlertTriangle className="size-3.5" aria-hidden />
                {order.penaltyUnits} {order.penaltyUnit.toLowerCase()}
                {order.penaltyUnits === 1 ? "" : "s"} overdue
              </p>
            )}

            <div className="mt-5 border-t border-line pt-4">
              {order.nextAction === "PICKUP" && (
                <form action={confirmPickupAction}>
                  <input type="hidden" name="orderId" value={order.id} />
                  <Button type="submit" size="lg" className="w-full">
                    <CheckCircle2 className="size-4" aria-hidden />
                    Confirm pickup
                  </Button>
                </form>
              )}

              {order.nextAction === "RETURN" && (
                <ReturnForm
                  orderId={order.id}
                  productId={order.firstProductId}
                  depositAmount={order.depositAmount}
                  estimatedPenalty={order.penaltyAmount}
                />
              )}

              {order.nextAction === "NONE" && (
                <Alert tone="success">
                  This rental is fully settled. Nothing left to do.
                </Alert>
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
