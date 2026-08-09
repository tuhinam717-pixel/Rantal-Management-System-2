/**
 * Shared plumbing for the searchable / sortable / filterable list screens.
 *
 * Every list page reads the same shape of query string — `q`, `sort`, `page`,
 * `view` plus its own filter keys — so the URL stays the single source of
 * truth and any combination of controls survives pagination.
 */

export interface SortOption<TOrderBy> {
  value: string;
  label: string;
  orderBy: TOrderBy;
}

/** Falls back to the first option, which is therefore the default sort. */
export function resolveSort<TOrderBy>(
  value: string | undefined,
  options: SortOption<TOrderBy>[]
): SortOption<TOrderBy> {
  return options.find((option) => option.value === value) ?? options[0];
}

export type QueryParams = Record<string, string | number | undefined>;

/**
 * Builds a list URL from the current params plus overrides. `undefined` in an
 * override removes the key, and any change resets to page 1 — leaving `page`
 * behind is how a filter lands you on an empty page 7.
 */
export function listHref(
  basePath: string,
  params: QueryParams,
  overrides: QueryParams = {}
): string {
  const merged: QueryParams = { ...params, ...overrides, page: undefined };
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(merged)) {
    if (value === undefined || value === "") continue;
    search.set(key, String(value));
  }

  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}

/** Case-insensitive "contains" across several string columns. */
export function textSearch<TField extends string>(
  term: string | undefined,
  fields: TField[]
) {
  const trimmed = term?.trim();
  if (!trimmed) return undefined;

  return fields.map((field) => {
    // Dotted paths address a relation, e.g. "customer.name".
    const path = field.split(".");
    const leaf = { contains: trimmed, mode: "insensitive" as const };

    return path.reverse().reduce<Record<string, unknown>>(
      (acc, segment) => ({ [segment]: acc }),
      leaf as unknown as Record<string, unknown>
    );
  });
}

/**
 * Narrows a filter value to one the database will accept.
 *
 * Status filters used to be cast straight into a Prisma enum filter, so
 * `?status=GARBAGE` in the address bar reached Postgres as an invalid enum and
 * returned a 500. An unrecognised value now behaves like no filter at all,
 * which is what every other unparseable list param already does.
 */
export function resolveEnumFilter<T extends string>(
  value: string | undefined,
  allowed: readonly (T | undefined)[]
): T | undefined {
  if (!value) return undefined;
  return allowed.includes(value as T) ? (value as T) : undefined;
}
