"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/field";
import { FieldRow } from "@/components/ui/form-shell";
import {
  createRentalPeriodAction,
  type FormState,
} from "@/app/(admin)/admin/config-actions";

export function NewRentalPeriodDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    createRentalPeriodAction,
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
        New rental period
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New rental period"
        description="A block customers can rent for. For a weekend deal: unit Day, duration 3."
      >
        <form action={formAction} className="space-y-5">
          {state.error && <Alert tone="error">{state.error}</Alert>}

          <Input label="Name" name="name" placeholder="Weekend" required />

          <FieldRow>
            <Select label="Unit" name="unit" defaultValue="DAY" required>
              <option value="HOUR">Hour</option>
              <option value="DAY">Day</option>
              <option value="WEEK">Week</option>
              <option value="MONTH">Month</option>
            </Select>

            <Input
              label="Duration"
              name="duration"
              type="number"
              min={1}
              defaultValue={1}
              hint="How many units make one block"
              required
            />
          </FieldRow>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isPending}>
              Create period
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
