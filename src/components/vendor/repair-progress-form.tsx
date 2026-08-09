"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PencilLine } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/field";
import {
  updateRepairProgressAction,
  type FormState,
} from "@/app/(vendor)/vendor/actions";

export function RepairProgressDialog({
  job,
}: {
  job: {
    id: string;
    productName: string;
    issue: string;
    status: string;
    notes: string;
    actualCost: number | null;
    vendorReady: boolean;
  };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    updateRepairProgressAction,
    {}
  );

  const notStarted = job.status === "PENDING";

  useEffect(() => {
    if (state.ok && open) {
      setOpen(false);
      router.refresh();
    }
  }, [state.ok, open, router]);

  return (
    <>
      <Button variant="soft" size="sm" onClick={() => setOpen(true)}>
        <PencilLine className="size-4" aria-hidden />
        Update
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Update repair"
        description={job.productName}
      >
        <form action={formAction} className="space-y-5">
          <input type="hidden" name="jobId" value={job.id} />

          {state.error && <Alert tone="error">{state.error}</Alert>}

          <p className="rounded-lg bg-canvas p-3 text-sm text-ink-700">
            {job.issue}
          </p>

          {notStarted && (
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-canvas p-3.5 transition-colors hover:border-brand-300">
              <input
                type="checkbox"
                name="start"
                value="true"
                className="mt-0.5 size-4 rounded border-line text-brand-600 focus:ring-brand-600"
              />
              <span>
                <span className="block text-sm font-medium text-ink-900">
                  Mark as in progress
                </span>
                <span className="block text-xs text-ink-500">
                  Tells the rental team you have started work.
                </span>
              </span>
            </label>
          )}

          {!notStarted && (
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-canvas p-3.5 transition-colors hover:border-brand-300">
              <input
                type="checkbox"
                name="ready"
                value="true"
                defaultChecked={job.vendorReady}
                className="mt-0.5 size-4 rounded border-line text-brand-600 focus:ring-brand-600"
              />
              <span>
                <span className="block text-sm font-medium text-ink-900">
                  Work done — ready for collection
                </span>
                <span className="block text-xs text-ink-500">
                  Flags the job for the rental team to collect and close.
                </span>
              </span>
            </label>
          )}

          <Input
            label="Your quote"
            name="actualCost"
            type="number"
            min={0}
            step={100}
            defaultValue={job.actualCost ?? undefined}
            hint="What you will charge for this repair."
          />

          <Textarea
            label="Notes"
            name="notes"
            rows={3}
            defaultValue={job.notes}
            placeholder="Parts ordered, expected back Friday…"
          />

          <p className="text-xs text-ink-500">
            Closing the job stays with the rental team — closing it puts the
            units back into availability, so it waits until they physically
            have them.
          </p>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isPending}>
              Save update
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
