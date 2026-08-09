"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Plus, Wrench } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { AffixInput, Select, Textarea } from "@/components/ui/field";
import { FieldRow } from "@/components/ui/form-shell";
import {
  completeRepairAction,
  openRepairAction,
  writeOffRepairAction,
  type RepairState,
} from "@/app/(admin)/admin/repairs/actions";
import { formatCurrency } from "@/lib/utils";

/** Closes a job: repaired and back in service, or written off for good. */
export function CloseRepairDialog({
  id,
  productName,
  quantity,
  estimatedCost,
}: {
  id: string;
  productName: string;
  quantity: number;
  estimatedCost: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"complete" | "writeoff">("complete");

  const action = mode === "complete" ? completeRepairAction : writeOffRepairAction;
  const [state, formAction, isPending] = useActionState<RepairState, FormData>(
    action,
    {}
  );

  /*
    useActionState keeps its value after the dialog closes, so a reopened
    dialog would see the previous success and shut itself immediately.
    Comparing the state object identity is what makes each success fire once.
  */
  const handled = useRef<typeof state | null>(null);

  useEffect(() => {
    if (!open || !state.ok || handled.current === state) return;
    handled.current = state;
    setOpen(false);
    router.refresh();
  }, [state, open, router]);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <CheckCircle2 className="size-4" aria-hidden />
        Close job
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Close repair — ${productName}`}
        description={`${quantity} unit${quantity === 1 ? "" : "s"} currently out of service.`}
      >
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setMode("complete")}
              aria-pressed={mode === "complete"}
              className={
                mode === "complete"
                  ? "rounded-xl border border-brand-500 bg-brand-100 p-3.5 text-left ring-1 ring-brand-500"
                  : "rounded-xl border border-line p-3.5 text-left hover:border-brand-300"
              }
            >
              <span className="block text-sm font-medium text-ink-900">
                Repaired
              </span>
              <span className="mt-0.5 block text-xs text-ink-500">
                Units go back into available stock.
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMode("writeoff")}
              aria-pressed={mode === "writeoff"}
              className={
                mode === "writeoff"
                  ? "rounded-xl border border-red-400 bg-red-50 p-3.5 text-left ring-1 ring-red-400"
                  : "rounded-xl border border-line p-3.5 text-left hover:border-red-300"
              }
            >
              <span className="block text-sm font-medium text-ink-900">
                Write off
              </span>
              <span className="mt-0.5 block text-xs text-ink-500">
                Beyond repair — removed from total stock.
              </span>
            </button>
          </div>

          <form action={formAction} className="space-y-4">
            <input type="hidden" name="id" value={id} />

            {state.error && <Alert tone="error">{state.error}</Alert>}

            {mode === "complete" && (
              <div className="max-w-48">
                <AffixInput
                  label="Actual repair cost"
                  name="actualCost"
                  type="number"
                  min={0}
                  step={100}
                  prefix="₹"
                  defaultValue={estimatedCost}
                  hint={`Estimated ${formatCurrency(estimatedCost)}`}
                  required
                />
              </div>
            )}

            <Textarea
              label="Notes"
              name="notes"
              rows={2}
              placeholder={
                mode === "complete"
                  ? "What was replaced or fixed"
                  : "Why it can't be repaired"
              }
            />

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant={mode === "writeoff" ? "danger" : "primary"}
                isLoading={isPending}
              >
                {mode === "complete" ? "Back in service" : "Write off"}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}

/** Manual entry for damage found outside a return. */
export function OpenRepairDialog({
  products,
  vendors,
}: {
  products: { id: string; name: string; available: number }[];
  vendors: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<RepairState, FormData>(
    openRepairAction,
    {}
  );

  useEffect(() => {
    if (state.ok && open) {
      setOpen(false);
      router.refresh();
    }
  }, [state.ok, open, router]);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" aria-hidden />
        Log a repair
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Log a repair"
        description="For damage spotted outside a return inspection. The units are withdrawn from availability."
      >
        <form action={formAction} className="space-y-5">
          {state.error && <Alert tone="error">{state.error}</Alert>}

          <Select label="Product" name="productId" required>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.available} free)
              </option>
            ))}
          </Select>

          {/* Optional: leave blank for an in-house job. */}
          <Select label="Send to vendor" name="vendorId">
            <option value="">Repair in house</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </Select>

          <Input
            label="What is wrong"
            name="issue"
            placeholder="Lens mount cracked"
            required
          />

          <FieldRow>
            <Input
              label="Units affected"
              name="quantity"
              type="number"
              min={1}
              defaultValue={1}
              required
            />
            <AffixInput
              label="Estimated cost"
              name="estimatedCost"
              type="number"
              min={0}
              step={100}
              prefix="₹"
              defaultValue={0}
              required
            />
          </FieldRow>

          <Input
            label="Assigned to"
            name="assignedTo"
            placeholder="In-house workshop"
          />

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isPending}>
              <Wrench className="size-4" aria-hidden />
              Open repair job
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
