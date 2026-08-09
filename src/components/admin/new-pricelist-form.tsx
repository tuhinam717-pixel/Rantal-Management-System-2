"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { FieldRow } from "@/components/ui/form-shell";
import {
  createPricelistAction,
  type FormState,
} from "@/app/(admin)/admin/config-actions";

export function NewPricelistDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    createPricelistAction,
    {}
  );

  // Close and refresh once the server confirms the write.
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

  const dateClass =
    "block w-full rounded-xl border-0 bg-surface py-2.5 pl-3.5 text-sm text-ink-900 shadow-sm ring-1 ring-inset ring-line hover:ring-brand-300 focus:ring-2 focus:ring-inset focus:ring-brand-600 focus:outline-none";

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" aria-hidden />
        New pricelist
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New pricelist"
        description="Leave the dates blank for a list that always applies."
      >
        <form id="new-pricelist" action={formAction} className="space-y-5">
          {state.error && <Alert tone="error">{state.error}</Alert>}

          <Input
            label="Name"
            name="name"
            placeholder="Festive Season 2026"
            required
          />

          <FieldRow>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink-700">
                Valid from
              </span>
              <input type="date" name="validFrom" className={dateClass} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink-700">
                Valid to
              </span>
              <input type="date" name="validTo" className={dateClass} />
            </label>
          </FieldRow>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-canvas p-3.5 transition-colors hover:border-brand-300">
            <input
              type="checkbox"
              name="isActive"
              value="true"
              defaultChecked
              className="mt-0.5 size-4 rounded border-line text-brand-600 focus:ring-brand-600"
            />
            <span>
              <span className="block text-sm font-medium text-ink-900">
                Active
              </span>
              <span className="block text-xs text-ink-500">
                Inactive lists are kept but never applied to the catalogue.
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
              Create pricelist
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
