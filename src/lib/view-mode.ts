/**
 * Shared by server pages and the client ViewToggle.
 *
 * Kept out of the toggle component on purpose: that file is "use client", and
 * a server component cannot call a function exported from a client module.
 */

export type ViewMode = "table" | "cards";

/** Normalises the `view` search param, defaulting to the table layout. */
export function resolveView(value: string | undefined): ViewMode {
  return value === "cards" ? "cards" : "table";
}
