"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ClipboardList, Save } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  confirmPickupWithChecklistAction,
  saveChecklistAction,
  type PickupState,
} from "@/app/(admin)/admin/pickups/actions";
import { checklistProgress, type ChecklistItem } from "@/lib/rental/pickup-checklist";
import { cn } from "@/lib/utils";

/**
 * Handover checklist. Confirmation is only offered once the required items are
 * ticked — the server enforces the same rule, this just makes it visible.
 */
export function PickupChecklist({
  pickupId,
  orderNumber,
  items,
  compact = false,
}: {
  pickupId: string;
  orderNumber: string;
  items: ChecklistItem[];
  compact?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState<string[]>(
    items.filter((i) => i.done).map((i) => i.id)
  );
  const [state, setState] = useState<PickupState>({});
  const [isPending, startTransition] = useTransition();

  const current = items.map((i) => ({ ...i, done: checked.includes(i.id) }));
  const progress = checklistProgress(current);
  const savedProgress = checklistProgress(items);

  function toggle(id: string) {
    setChecked((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setState({});
  }

  function save() {
    startTransition(async () => {
      setState(await saveChecklistAction(pickupId, checked));
      router.refresh();
    });
  }

  function confirm() {
    startTransition(async () => {
      const result = await confirmPickupWithChecklistAction(pickupId, checked);
      setState(result);
      if (result.ok) {
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <>
      <Button
        variant={savedProgress.complete ? "primary" : "secondary"}
        size="sm"
        onClick={() => setOpen(true)}
      >
        <ClipboardList className="size-4" aria-hidden />
        {compact
          ? `${savedProgress.requiredDone}/${savedProgress.requiredTotal}`
          : `Checklist ${savedProgress.requiredDone}/${savedProgress.requiredTotal}`}
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Handover checklist — ${orderNumber}`}
        description="Required items must be ticked before the pickup can be confirmed."
        size="md"
      >
        <div className="space-y-4">
          {state.error && <Alert tone="error">{state.error}</Alert>}

          <ul className="space-y-2">
            {items.map((item) => {
              const isDone = checked.includes(item.id);

              return (
                <li key={item.id}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors",
                      isDone
                        ? "border-brand-400 bg-brand-50"
                        : "border-line hover:border-brand-300"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isDone}
                      onChange={() => toggle(item.id)}
                      className="mt-0.5 size-4 rounded border-line text-brand-600 focus:ring-brand-600"
                    />
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink-900">
                        {item.label}
                        {!item.required && (
                          <span className="rounded-full bg-canvas px-2 py-0.5 text-xs font-normal text-ink-500">
                            optional
                          </span>
                        )}
                      </span>
                      {item.hint && (
                        <span className="mt-0.5 block text-xs text-ink-500">
                          {item.hint}
                        </span>
                      )}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>

          <div className="rounded-xl bg-brand-50 p-3.5 ring-1 ring-inset ring-brand-200">
            <div className="flex items-center justify-between text-xs">
              <span className="text-ink-700">Required items</span>
              <span className="font-semibold tabular-nums text-ink-900">
                {progress.requiredDone} / {progress.requiredTotal}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-200">
              <div
                className="h-full rounded-full bg-brand-600 transition-[width]"
                style={{
                  width: `${(progress.requiredDone / progress.requiredTotal) * 100}%`,
                }}
              />
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
            <Button variant="secondary" onClick={save} isLoading={isPending}>
              {!isPending && <Save className="size-4" aria-hidden />}
              Save progress
            </Button>
            <Button
              onClick={confirm}
              isLoading={isPending}
              disabled={!progress.complete}
              title={
                progress.complete
                  ? undefined
                  : "Tick every required item to confirm"
              }
            >
              {!isPending && <CheckCircle2 className="size-4" aria-hidden />}
              Confirm pickup
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
