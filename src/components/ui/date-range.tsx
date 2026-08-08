import { ArrowRight } from "lucide-react";

import { cn, formatDate } from "@/lib/utils";

/**
 * Renders "01 Aug 2026 -> 04 Aug 2026" with an icon as the separator rather
 * than an arrow glyph, so the whole app stays on the icon set.
 */
export function DateRange({
  from,
  to,
  className,
}: {
  from: Date | string;
  to: Date | string;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      {formatDate(from)}
      <ArrowRight className="size-3 shrink-0 opacity-60" aria-label="to" />
      {formatDate(to)}
    </span>
  );
}
