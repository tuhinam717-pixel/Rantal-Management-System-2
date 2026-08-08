"use client";

import { forwardRef, useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { controlClass } from "@/components/ui/field";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { className, label, error, hint, icon, id, type = "text", required, ...props },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const describedBy = error
      ? `${inputId}-error`
      : hint
        ? `${inputId}-hint`
        : undefined;

    const isPassword = type === "password";
    const [revealed, setRevealed] = useState(false);
    const resolvedType = isPassword && revealed ? "text" : type;

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
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

        <div className="relative">
          {icon && (
            <span
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400"
              aria-hidden
            >
              {icon}
            </span>
          )}

          <input
            id={inputId}
            ref={ref}
            type={resolvedType}
            required={required}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={describedBy}
            className={cn(
              controlClass,
              "py-2.5",
              icon ? "pl-10" : "pl-3.5",
              isPassword ? "pr-11" : "pr-3.5",
              error && "ring-red-300 focus:ring-red-500 text-red-900",
              className
            )}
            {...props}
          />

          {isPassword && (
            <button
              type="button"
              onClick={() => setRevealed((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-brand-50 hover:text-ink-700"
              aria-label={revealed ? "Hide password" : "Show password"}
              tabIndex={-1}
            >
              {revealed ? (
                <EyeOff className="size-4" aria-hidden />
              ) : (
                <Eye className="size-4" aria-hidden />
              )}
            </button>
          )}
        </div>

        {error ? (
          <p id={`${inputId}-error`} className="text-xs font-medium text-red-600">
            {error}
          </p>
        ) : hint ? (
          <p id={`${inputId}-hint`} className="text-xs text-ink-500">
            {hint}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
