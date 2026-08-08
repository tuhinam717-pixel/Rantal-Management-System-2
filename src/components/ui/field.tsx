"use client";

import { forwardRef, useId } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

/** Shared control chrome so inputs, selects and textareas look identical. */
export const controlClass =
  "block w-full rounded-xl border-0 bg-surface text-sm text-ink-900 shadow-sm " +
  "ring-1 ring-inset ring-line placeholder:text-ink-400 " +
  "transition-[box-shadow,background-color] " +
  "hover:ring-brand-300 " +
  "focus:ring-2 focus:ring-inset focus:ring-brand-600 focus:outline-none " +
  "disabled:cursor-not-allowed disabled:bg-canvas disabled:text-ink-500";

function FieldShell({
  id,
  label,
  hint,
  error,
  required,
  children,
}: {
  id: string;
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={id}
          className="flex items-center gap-1 text-sm font-medium text-ink-700"
        >
          {label}
          {required && (
            <span className="text-brand-600" aria-hidden>
              *
            </span>
          )}
        </label>
      )}

      {children}

      {error ? (
        <p id={`${id}-error`} className="text-xs font-medium text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-ink-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, hint, error, id, children, required, ...props }, ref) => {
    const generated = useId();
    const selectId = id ?? generated;

    return (
      <FieldShell
        id={selectId}
        label={label}
        hint={hint}
        error={error}
        required={required}
      >
        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            required={required}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={
              error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined
            }
            className={cn(
              controlClass,
              "appearance-none py-2.5 pl-3.5 pr-10",
              error && "ring-red-300 focus:ring-red-500",
              className
            )}
            {...props}
          >
            {children}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-400"
            aria-hidden
          />
        </div>
      </FieldShell>
    );
  }
);
Select.displayName = "Select";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, hint, error, id, required, ...props }, ref) => {
    const generated = useId();
    const areaId = id ?? generated;

    return (
      <FieldShell
        id={areaId}
        label={label}
        hint={hint}
        error={error}
        required={required}
      >
        <textarea
          id={areaId}
          ref={ref}
          required={required}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={
            error ? `${areaId}-error` : hint ? `${areaId}-hint` : undefined
          }
          className={cn(
            controlClass,
            "resize-y px-3.5 py-2.5",
            error && "ring-red-300 focus:ring-red-500",
            className
          )}
          {...props}
        />
      </FieldShell>
    );
  }
);
Textarea.displayName = "Textarea";

/** Money / percentage input with the unit rendered inside the control. */
export const AffixInput = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & {
    label?: string;
    hint?: string;
    error?: string;
    prefix?: string;
    suffix?: string;
  }
>(({ className, label, hint, error, prefix, suffix, id, required, ...props }, ref) => {
  const generated = useId();
  const inputId = id ?? generated;

  return (
    <FieldShell
      id={inputId}
      label={label}
      hint={hint}
      error={error}
      required={required}
    >
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-500">
            {prefix}
          </span>
        )}
        <input
          id={inputId}
          ref={ref}
          required={required}
          aria-invalid={Boolean(error) || undefined}
          className={cn(
            controlClass,
            "py-2.5",
            prefix ? "pl-9" : "pl-3.5",
            suffix ? "pr-10" : "pr-3.5",
            error && "ring-red-300 focus:ring-red-500",
            className
          )}
          {...props}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-500">
            {suffix}
          </span>
        )}
      </div>
    </FieldShell>
  );
});
AffixInput.displayName = "AffixInput";
