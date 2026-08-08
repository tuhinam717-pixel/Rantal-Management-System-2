"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { AffixInput, Select } from "@/components/ui/field";
import { FieldRow } from "@/components/ui/form-shell";
import {
  saveLateFeeRuleAction,
  type FormState,
} from "@/app/(admin)/admin/config-actions";

export interface LateFeeRuleValues {
  id: string;
  name: string;
  unit: string;
  amountPerUnit: number;
  graceHours: number;
  maxAmount: number | null;
  isActive: boolean;
}

export function LateFeeRuleDialog({
  initial,
  trigger,
}: {
  initial?: LateFeeRuleValues;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    saveLateFeeRuleAction,
    {}
  );

  useEffect(() => {
    if (state.ok && open) {
      setOpen(false);
      router.refresh();
    }
  }, [state.ok, open, router]);

  const editing = Boolean(initial);

  return (
    <>
      <span onClick={() => setOpen(true)} className="contents">
        {trigger ?? (
          <Button>
            <Plus className="size-4" aria-hidden />
            New rule
          </Button>
        )}
      </span>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit charging rule" : "New charging rule"}
        description="Only one rule should be active — that is the one applied when a return is settled."
      >
        <form action={formAction} className="space-y-5">
          {initial && <input type="hidden" name="id" value={initial.id} />}
          {state.error && <Alert tone="error">{state.error}</Alert>}

          <Input
            label="Rule name"
            name="name"
            defaultValue={initial?.name}
            placeholder="Standard daily late fee"
            required
          />

          <FieldRow>
            <Select
              label="Charge per"
              name="unit"
              defaultValue={initial?.unit ?? "DAY"}
              required
            >
              <option value="HOUR">Hour overdue</option>
              <option value="DAY">Day overdue</option>
              <option value="WEEK">Week overdue</option>
              <option value="MONTH">Month overdue</option>
            </Select>

            <AffixInput
              label="Amount"
              name="amountPerUnit"
              type="number"
              min={0}
              step={50}
              prefix="₹"
              defaultValue={initial?.amountPerUnit ?? 0}
              required
            />
          </FieldRow>

          <FieldRow>
            <AffixInput
              label="Grace period"
              name="graceHours"
              type="number"
              min={0}
              suffix="hrs"
              defaultValue={initial?.graceHours ?? 0}
              hint="Overdue time inside this window is free"
              required
            />
            <AffixInput
              label="Maximum"
              name="maxAmount"
              type="number"
              min={0}
              prefix="₹"
              defaultValue={initial?.maxAmount ?? ""}
              placeholder="Uncapped"
              hint="Leave blank for no cap"
            />
          </FieldRow>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-canvas p-3.5 transition-colors hover:border-brand-300">
            <input
              type="checkbox"
              name="isActive"
              value="true"
              defaultChecked={initial?.isActive ?? true}
              className="mt-0.5 size-4 rounded border-line text-brand-600 focus:ring-brand-600"
            />
            <span>
              <span className="block text-sm font-medium text-ink-900">
                Active
              </span>
              <span className="block text-xs text-ink-500">
                Applied to every late return from now on.
              </span>
            </span>
          </label>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isPending}>
              {editing ? "Save rule" : "Create rule"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
