import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { pageWindow, type PageMeta } from "@/lib/pagination";
import { cn } from "@/lib/utils";

/**
 * Plain links rather than a client component: pagination works without JS,
 * each page is shareable, and the server renders the correct page directly.
 *
 * `params` carries the page's other search params (filters, view mode) so
 * paging never silently drops them.
 */
export function Pagination({
  meta,
  basePath,
  params,
  label = "results",
}: {
  meta: PageMeta;
  basePath: string;
  params?: Record<string, string | undefined>;
  label?: string;
}) {
  if (meta.total === 0) return null;

  const href = (page: number) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params ?? {})) {
      if (value) search.set(key, value);
    }
    if (page > 1) search.set("page", String(page));

    const query = search.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  const pages = pageWindow(meta.page, meta.totalPages);
  const atStart = meta.page <= 1;
  const atEnd = meta.page >= meta.totalPages;

  const arrowClass = (disabled: boolean) =>
    cn(
      "inline-flex size-9 items-center justify-center rounded-lg text-sm transition-colors",
      disabled
        ? "cursor-not-allowed text-ink-400"
        : "text-ink-700 ring-1 ring-inset ring-line hover:bg-brand-50 hover:text-ink-900"
    );

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3"
    >
      <p className="text-sm text-ink-500">
        Showing{" "}
        <span className="font-medium text-ink-900">
          {meta.from}-{meta.to}
        </span>{" "}
        of <span className="font-medium text-ink-900">{meta.total}</span> {label}
      </p>

      {meta.totalPages > 1 && (
        <div className="flex items-center gap-1">
          {atStart ? (
            <span className={arrowClass(true)} aria-disabled>
              <ChevronLeft className="size-4" aria-hidden />
            </span>
          ) : (
            <Link
              href={href(meta.page - 1)}
              className={arrowClass(false)}
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </Link>
          )}

          {pages.map((page, index) =>
            page === null ? (
              <span
                key={`gap-${index}`}
                className="px-1 text-sm text-ink-400"
                aria-hidden
              >
                &hellip;
              </span>
            ) : (
              <Link
                key={page}
                href={href(page)}
                aria-current={page === meta.page ? "page" : undefined}
                className={cn(
                  "inline-flex size-9 items-center justify-center rounded-lg text-sm font-medium transition-colors",
                  page === meta.page
                    ? "bg-brand-600 text-white shadow-card"
                    : "text-ink-700 ring-1 ring-inset ring-line hover:bg-brand-50"
                )}
              >
                {page}
              </Link>
            )
          )}

          {atEnd ? (
            <span className={arrowClass(true)} aria-disabled>
              <ChevronRight className="size-4" aria-hidden />
            </span>
          ) : (
            <Link
              href={href(meta.page + 1)}
              className={arrowClass(false)}
              aria-label="Next page"
            >
              <ChevronRight className="size-4" aria-hidden />
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
