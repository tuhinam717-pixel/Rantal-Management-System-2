"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

/**
 * Confirmation for a destructive action, in the app's own modal rather than a
 * native `confirm()`.
 *
 * `confirm()` is unstyled, ignores the design system, and blocks the whole
 * renderer while it is up. This also lets the confirming button carry the
 * danger styling and the real verb, so "Delete" is what you click, not "OK".
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "Are you sure?",
  message,
  confirmLabel = "Delete",
  tone = "danger",
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmLabel?: string;
  tone?: "danger" | "primary";
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="space-y-5">
        <div className="flex gap-3">
          {tone === "danger" && (
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-red-50 text-red-600">
              <AlertTriangle className="size-5" aria-hidden />
            </span>
          )}
          <p className="text-sm text-ink-700">{message}</p>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={tone === "danger" ? "danger" : "primary"}
            onClick={onConfirm}
            autoFocus
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/**
 * Wraps a form-submitting child so it asks first.
 *
 * The child button must live inside a `<form>`; confirming calls
 * `requestSubmit()` on that form, which runs the server action exactly as a
 * normal submit would.
 */
export function useConfirmSubmit() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<HTMLFormElement | null>(null);

  return {
    open,
    ask(target: HTMLFormElement | null) {
      setForm(target);
      setOpen(true);
    },
    cancel() {
      setOpen(false);
    },
    confirm() {
      setOpen(false);
      form?.requestSubmit();
    },
  };
}
