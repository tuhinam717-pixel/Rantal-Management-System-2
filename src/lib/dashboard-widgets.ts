/**
 * The dashboard tiles an admin can show, hide and reorder.
 *
 * Keys are stored as a JSON array on the user, so the order in that array is
 * the order on screen. Anything unknown (a widget removed in a later release)
 * is dropped on read rather than rendering a blank tile.
 */
export const WIDGETS = [
  { key: "activeRentals", label: "Active rentals" },
  { key: "dueToday", label: "Rentals due today" },
  { key: "upcomingPickups", label: "Upcoming pickups" },
  { key: "upcomingReturns", label: "Upcoming returns" },
  { key: "overdueRentals", label: "Overdue rentals" },
  { key: "rentalRevenue", label: "Revenue from rentals" },
  { key: "depositsHeld", label: "Security deposits held" },
  { key: "lateFeesCollected", label: "Late fees collected" },
] as const;

export type WidgetKey = (typeof WIDGETS)[number]["key"];

export const DEFAULT_WIDGETS: WidgetKey[] = WIDGETS.map((w) => w.key);

const VALID = new Set<string>(DEFAULT_WIDGETS);

/** Null, malformed JSON or an empty selection all fall back to the full set. */
export function resolveWidgets(stored: string | null | undefined): WidgetKey[] {
  if (!stored) return DEFAULT_WIDGETS;

  let parsed: unknown;
  try {
    parsed = JSON.parse(stored);
  } catch {
    return DEFAULT_WIDGETS;
  }

  if (!Array.isArray(parsed)) return DEFAULT_WIDGETS;

  const keys = parsed.filter(
    (k): k is WidgetKey => typeof k === "string" && VALID.has(k)
  );

  // De-duplicate while keeping the chosen order.
  const seen = new Set<WidgetKey>();
  const unique = keys.filter((k) => !seen.has(k) && seen.add(k));

  return unique.length > 0 ? unique : DEFAULT_WIDGETS;
}
