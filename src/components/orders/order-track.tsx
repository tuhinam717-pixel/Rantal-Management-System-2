import { Check, Circle, Dot, X } from "lucide-react";

import { orderStages, trackHeadline } from "@/lib/rental/tracking";
import { cn, formatDate } from "@/lib/utils";

const TONE = {
  neutral: "bg-slate-100 text-ink-700",
  good: "bg-emerald-50 text-emerald-800",
  warn: "bg-amber-50 text-amber-800",
  bad: "bg-red-50 text-red-700",
} as const;

/**
 * Where a rental has got to, as a horizontal track.
 *
 * Shared by the admin and customer tracking screens so both read the same
 * progress from the same rule — a customer chasing an order and the person
 * they phone about it should not be looking at different pictures.
 */
export function OrderTrack({
  order,
  className,
}: {
  order: {
    status: string;
    createdAt: Date;
    rentalEnd: Date;
    returnedAt?: Date | null;
    pickup?: { confirmedAt: Date | null } | null;
    return?: { receivedAt: Date | null } | null;
  };
  className?: string;
}) {
  const stages = orderStages(order);
  const headline = trackHeadline(order);

  return (
    <div className={cn("space-y-3", className)}>
      <span
        className={cn(
          "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
          TONE[headline.tone]
        )}
      >
        {headline.text}
      </span>

      <ol className="flex flex-wrap items-start gap-x-1 gap-y-3">
        {stages.map((stage, index) => (
          <li key={stage.key} className="flex items-start gap-1">
            <div className="flex w-20 flex-col items-center gap-1 text-center">
              <span
                className={cn(
                  "grid size-6 place-items-center rounded-full ring-1",
                  stage.state === "done" &&
                    "bg-brand-600 text-white ring-brand-600",
                  stage.state === "current" &&
                    "bg-white text-brand-700 ring-2 ring-brand-600",
                  stage.state === "upcoming" &&
                    "bg-white text-slate-300 ring-slate-200",
                  stage.state === "skipped" &&
                    "bg-slate-100 text-slate-400 ring-slate-200"
                )}
              >
                {stage.state === "done" ? (
                  <Check className="size-3.5" aria-hidden />
                ) : stage.state === "current" ? (
                  <Dot className="size-5" aria-hidden />
                ) : stage.state === "skipped" ? (
                  <X className="size-3" aria-hidden />
                ) : (
                  <Circle className="size-2.5" aria-hidden />
                )}
              </span>

              <span
                className={cn(
                  "text-[11px] leading-tight",
                  stage.state === "current"
                    ? "font-semibold text-ink-900"
                    : stage.state === "done"
                      ? "text-ink-700"
                      : "text-ink-400"
                )}
              >
                {stage.label}
              </span>

              {stage.at && (
                <span className="text-[10px] text-ink-400">
                  {formatDate(stage.at)}
                </span>
              )}
            </div>

            {index < stages.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  "mt-3 h-0.5 w-4 rounded-full",
                  stage.state === "done" ? "bg-brand-600" : "bg-slate-200"
                )}
              />
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
