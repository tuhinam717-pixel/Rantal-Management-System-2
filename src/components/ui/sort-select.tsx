"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDown } from "lucide-react";

/**
 * Changing the sort navigates immediately rather than needing a second click
 * on a submit button. Page is dropped so you land back on the first page.
 */
export function SortSelect({
  options,
  current,
}: {
  options: { value: string; label: string }[];
  current: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <label className="relative flex shrink-0 items-center">
      <span className="sr-only">Sort by</span>
      <ArrowUpDown
        className="pointer-events-none absolute left-3 size-4 text-ink-400"
        aria-hidden
      />
      <select
        value={current}
        onChange={(event) => {
          const params = new URLSearchParams(searchParams.toString());
          params.set("sort", event.target.value);
          params.delete("page");
          router.push(`${pathname}?${params.toString()}`);
        }}
        className="appearance-none rounded-lg border-0 bg-white py-2 pl-9 pr-8 text-sm text-ink-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-brand-600"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
