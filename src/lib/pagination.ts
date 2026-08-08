/**
 * Page-based pagination shared by every list screen.
 *
 * State lives in the `page` search param so a page is linkable, survives a
 * reload, and is resolved on the server — the list renders at the right offset
 * on first paint instead of fetching after mount.
 */

export const DEFAULT_PAGE_SIZE = 20;

export interface PageInfo {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

/** Clamps a user-supplied `?page=` into a usable offset. */
export function resolvePage(
  raw: string | undefined,
  pageSize = DEFAULT_PAGE_SIZE
): PageInfo {
  const parsed = Number(raw);
  const page = Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1;

  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  from: number;
  to: number;
}

export function pageMeta(info: PageInfo, total: number): PageMeta {
  const totalPages = Math.max(1, Math.ceil(total / info.pageSize));
  // A deleted row can leave someone past the end; report the real bounds.
  const from = total === 0 ? 0 : info.skip + 1;
  const to = Math.min(total, info.skip + info.pageSize);

  return { page: info.page, pageSize: info.pageSize, total, totalPages, from, to };
}

/**
 * Page numbers to render, with `null` marking a gap.
 * e.g. 1 … 4 5 [6] 7 8 … 15
 */
export function pageWindow(current: number, totalPages: number): (number | null)[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = new Set<number>([1, totalPages, current]);
  for (const offset of [-1, 1]) {
    const n = current + offset;
    if (n > 1 && n < totalPages) pages.add(n);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const out: (number | null)[] = [];

  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push(null);
    out.push(n);
  });

  return out;
}
