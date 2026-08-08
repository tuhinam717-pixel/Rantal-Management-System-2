import Link from "next/link";
import { Search } from "lucide-react";

import { SortSelect } from "@/components/ui/sort-select";
import { listHref, type QueryParams } from "@/lib/list-query";
import { cn } from "@/lib/utils";

export interface ToolbarFilter {
  /** Query-string key this group writes to, e.g. "status". */
  key: string;
  label?: string;
  /** `value: undefined` is the "All" chip. */
  options: { value?: string; label: string }[];
}

/**
 * The search / sort / filter strip shared by every list screen.
 *
 * Search is a plain GET form so it works without JavaScript; the other params
 * ride along as hidden inputs so searching never drops the active filters.
 */
export function ListToolbar({
  basePath,
  params,
  searchPlaceholder,
  sortOptions,
  filters = [],
}: {
  basePath: string;
  params: QueryParams;
  searchPlaceholder?: string;
  sortOptions?: { value: string; label: string }[];
  filters?: ToolbarFilter[];
}) {
  const hiddenParams = Object.entries(params).filter(
    ([key, value]) =>
      value !== undefined && value !== "" && key !== "q" && key !== "page"
  );

  return (
    <div className="space-y-3">
      {filters.map((filter) => (
        <div key={filter.key} className="flex flex-wrap items-center gap-2">
          {filter.label && (
            <span className="mr-1 text-xs font-medium uppercase tracking-wide text-ink-400">
              {filter.label}
            </span>
          )}
          {filter.options.map((option) => {
            const active = (params[filter.key] ?? undefined) === option.value;

            return (
              <Link
                key={`${filter.key}-${option.value ?? "all"}`}
                href={listHref(basePath, params, {
                  [filter.key]: option.value,
                })}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-brand-600 text-white"
                    : "bg-white text-ink-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-50"
                )}
              >
                {option.label}
              </Link>
            );
          })}
        </div>
      ))}

      {(searchPlaceholder || sortOptions) && (
        <div className="flex flex-wrap items-center gap-2">
          {searchPlaceholder && (
            <form action={basePath} role="search" className="flex min-w-0 flex-1 gap-2">
              {hiddenParams.map(([key, value]) => (
                <input key={key} type="hidden" name={key} value={String(value)} />
              ))}

              <div className="relative min-w-0 flex-1 sm:max-w-xs">
                <label htmlFor={`${basePath}-search`} className="sr-only">
                  Search
                </label>
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400"
                  aria-hidden
                />
                <input
                  id={`${basePath}-search`}
                  name="q"
                  type="search"
                  defaultValue={params.q ? String(params.q) : ""}
                  placeholder={searchPlaceholder}
                  className="w-full rounded-lg border-0 bg-white py-2 pl-9 pr-3 text-sm text-ink-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-brand-600"
                />
              </div>

              <button
                type="submit"
                className="shrink-0 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-700"
              >
                Search
              </button>

              {params.q && (
                <Link
                  href={listHref(basePath, params, { q: undefined })}
                  className="shrink-0 self-center text-sm font-medium text-ink-500 hover:text-ink-900"
                >
                  Clear
                </Link>
              )}
            </form>
          )}

          {sortOptions && (
            <SortSelect
              options={sortOptions}
              current={params.sort ? String(params.sort) : sortOptions[0].value}
            />
          )}
        </div>
      )}
    </div>
  );
}
