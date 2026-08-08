"use client";

import { useFormStatus } from "react-dom";
import { Loader2, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Submit button for a delete form.
 *
 * Uses a native `confirm()` on purpose: it's a genuine destructive action and
 * this keeps a modal implementation out of the way for now.
 */
export function DeleteButton({
  label = "Delete",
  confirmMessage = "Are you sure? This cannot be undone.",
  className,
}: {
  label?: string;
  confirmMessage?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) event.preventDefault();
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
  );
}
