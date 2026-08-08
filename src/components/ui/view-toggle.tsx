"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { LayoutGrid, Table2 } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ViewMode } from "@/lib/view-mode";

/**
 * Table / card switch. State lives in the `view` query param so the choice
 * survives a reload and can be shared in a link, and so the server component
 * renders the right shape on first paint (no flash of the wrong view).
 */
export function ViewToggle({ current }: { current: ViewMode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setView(view: ViewMode) {
    const params = new URLSearchParams(searchParams.toString());
    if (view === "table") params.delete("view");
    else params.set("view", view);

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  const options: { value: ViewMode; label: string; Icon: typeof Table2 }[] = [
    { value: "table", label: "Table view", Icon: Table2 },
    { value: "cards", label: "Card view", Icon: LayoutGrid },
  ];

  return (
    <div
      role="group"
      aria-label="Change layout"
      className="inline-flex rounded-xl border border-line bg-surface p-1 shadow-card"
    >
      {options.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => setView(value)}
          aria-pressed={current === value}
          title={label}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
            current === value
              ? "bg-brand-200 text-brand-800"
              : "text-ink-500 hover:bg-brand-50 hover:text-ink-900"
          )}
        >
          <Icon className="size-4" aria-hidden />
          <span className="hidden sm:inline">
            {value === "table" ? "Table" : "Cards"}
          </span>
        </button>
      ))}
    </div>
  );
}
