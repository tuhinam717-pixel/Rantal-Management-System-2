"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/field";
import {
  saveTemplateAction,
  type FormState,
} from "@/app/(admin)/admin/quotations/actions";

export function NewTemplateDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    saveTemplateAction,
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
        New template
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New quotation template"
        description="Reused on every quotation you send, so building one is faster."
        size="lg"
      >
        <form action={formAction} className="space-y-5">
          {state.error && <Alert tone="error">{state.error}</Alert>}

          <Input
            label="Template name"
            name="name"
            placeholder="Standard quotation"
            required
          />

          <Textarea
            label="Header"
            name="header"
            rows={2}
            placeholder="RentFlow Rentals — Quotation"
            hint="Appears at the top of the quotation."
          />

          <Textarea
            label="Footer"
            name="footer"
            rows={2}
            placeholder="Thank you for your business."
          />

          <Textarea
            label="Terms"
            name="terms"
            rows={4}
            placeholder="Deposit refunded in full on on-time return. Late returns attract a penalty deducted from the deposit."
          />

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-canvas p-3.5 transition-colors hover:border-brand-300">
            <input
              type="checkbox"
              name="isDefault"
              value="true"
              className="mt-0.5 size-4 rounded border-line text-brand-600 focus:ring-brand-600"
            />
            <span>
              <span className="block text-sm font-medium text-ink-900">
                Use as the default template
              </span>
              <span className="block text-xs text-ink-500">
                Applied automatically to new quotations.
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
              Save template
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
