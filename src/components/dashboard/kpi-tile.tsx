import type { LucideIcon } from "lucide-react";

import { cn, formatCurrency } from "@/lib/utils";

export function KpiTile({
  label,
  value,
  icon: Icon,
  tone = "default",
  currency = false,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tone?: "default" | "warning" | "danger" | "success";
  currency?: boolean;
}) {
  const tones = {
    default: "bg-slate-100 text-ink-700",
    warning: "bg-amber-50 text-amber-700",
    danger: "bg-red-50 text-red-700",
    success: "bg-emerald-50 text-emerald-700",
  } as const;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-ink-500">{label}</p>
        <span
          className={cn("grid size-8 shrink-0 place-items-center rounded-lg", tones[tone])}
        >
          <Icon className="size-4" aria-hidden />
        </span>
      </div>
      <p
        className={cn(
          "mt-2 font-semibold tabular-nums text-ink-900",
          currency ? "text-xl" : "text-2xl"
        )}
      >
        {currency ? formatCurrency(value) : value}
      </p>
    </div>
  );
}
