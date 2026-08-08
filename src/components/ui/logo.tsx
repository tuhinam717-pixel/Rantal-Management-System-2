import { PackageCheck } from "lucide-react";

import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  inverted = false,
}: {
  className?: string;
  inverted?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "grid size-9 place-items-center rounded-xl shadow-sm",
          inverted ? "bg-white/15 text-white" : "bg-brand-600 text-white"
        )}
      >
        <PackageCheck className="size-5" aria-hidden />
      </span>
      <span
        className={cn(
          "text-lg font-semibold tracking-tight",
          inverted ? "text-white" : "text-ink-900"
        )}
      >
        {APP_NAME}
      </span>
    </span>
  );
}
