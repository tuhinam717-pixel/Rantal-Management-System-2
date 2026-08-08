"use client";

import { cn } from "@/lib/utils";

const RULES = [
  { label: "8+ characters", test: (v: string) => v.length >= 8 },
  { label: "lowercase", test: (v: string) => /[a-z]/.test(v) },
  { label: "uppercase", test: (v: string) => /[A-Z]/.test(v) },
  { label: "number", test: (v: string) => /[0-9]/.test(v) },
];

const LABELS = ["Too weak", "Weak", "Fair", "Good", "Strong"] as const;
const BAR_COLORS = [
  "bg-slate-200",
  "bg-red-500",
  "bg-amber-500",
  "bg-lime-500",
  "bg-emerald-500",
];

/** Mirrors the rules in `signupSchema` so the hint never drifts from validation. */
export function PasswordStrength({ value }: { value: string }) {
  const passed = RULES.filter((r) => r.test(value)).length;

  if (!value) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1.5" aria-hidden>
        {RULES.map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i < passed ? BAR_COLORS[passed] : "bg-slate-200"
            )}
          />
        ))}
      </div>
      <p className="text-xs text-ink-500">
        Password strength:{" "}
        <span className="font-medium text-ink-700">{LABELS[passed]}</span>
        {passed < RULES.length && (
          <>
            {" — still needs "}
            {RULES.filter((r) => !r.test(value))
              .map((r) => r.label)
              .join(", ")}
          </>
        )}
      </p>
    </div>
  );
}
