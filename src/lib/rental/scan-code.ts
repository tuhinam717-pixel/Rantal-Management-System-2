/**
 * Scannable codes for pickup and return.
 *
 * The payload is the order number behind a short prefix, so a scan is a single
 * lookup and the code stays readable if someone types it by hand. No ids or
 * personal data go in the code: anyone can point a camera at it, and an order
 * number alone is useless without an admin session.
 */

const PREFIX = "RENTFLOW";

/** "RENTFLOW:RO-2026-0001" */
export function buildScanCode(orderNumber: string): string {
  return `${PREFIX}:${orderNumber.trim().toUpperCase()}`;
}

/**
 * Accepts a full scan payload, a bare order number, or either with stray
 * whitespace/casing, and returns the order number. Null when unparseable.
 */
export function parseScanCode(raw: string): string | null {
  const value = raw.trim().toUpperCase();
  if (!value) return null;

  const withoutPrefix = value.startsWith(`${PREFIX}:`)
    ? value.slice(PREFIX.length + 1)
    : value;

  // Order numbers look like RO-2026-0001; quotations like QT-2026-0001.
  return /^(RO|QT)-\d{4}-\d{4}$/.test(withoutPrefix) ? withoutPrefix : null;
}
