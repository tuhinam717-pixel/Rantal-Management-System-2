"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Trash2 } from "lucide-react";

import {
  ConfirmDialog,
  useConfirmSubmit,
} from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";

/**
 * Submit button for a destructive form action, gated behind the app's own
 * confirmation modal.
 *
 * The click is swallowed and the modal opened instead; confirming calls
 * `requestSubmit()` on the surrounding form, so the server action runs exactly
 * as it would on a plain submit and `useFormStatus` still reports pending.
 */
export function DeleteButton({
  label = "Delete",
  confirmMessage = "This cannot be undone.",
  confirmTitle,
  confirmLabel,
  className,
}: {
  label?: string;
  confirmMessage?: string;
  confirmTitle?: string;
  confirmLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const confirmer = useConfirmSubmit();

  return (
    <>
      <button
        ref={buttonRef}
        type="submit"
        disabled={pending}
        aria-label={label || "Delete"}
        onClick={(event) => {
          event.preventDefault();
          confirmer.ask(buttonRef.current?.form ?? null);
        }}
        className={cn(
          "inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium text-red-600 transition-colors",
          "hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600",
          "disabled:cursor-not-allowed disabled:opacity-60",
          className
        )}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Trash2 className="size-4" aria-hidden />
        )}
        {label}
      </button>

      <ConfirmDialog
        open={confirmer.open}
        onClose={confirmer.cancel}
        onConfirm={confirmer.confirm}
        title={confirmTitle ?? (label ? `${label}?` : "Delete?")}
        message={confirmMessage}
        confirmLabel={confirmLabel ?? (label || "Delete")}
      />
    </>
  );
}
