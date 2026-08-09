/**
 * Whether a rental order still has a step the scan station can act on.
 *
 * One rule, used by the scanner and by every place that prints the QR, because
 * they had drifted into four different answers: the admin page hid the code
 * once the item was back but still showed it on a cancelled rental, the portal
 * page hid it for cancelled but showed it after a return, the invoice showed
 * it always, and the scanner would offer "Confirm pickup" on a cancelled
 * order because its pickup row was still outstanding.
 *
 * Printing a code that resolves to no action is worse than printing none: the
 * customer brings it to the counter and the staff member has nothing to do
 * with it.
 */
export function isScannable(order: {
  status: string;
  returnedAt: Date | null;
}): boolean {
  // A cancelled rental never happens, and a completed one is finished. Neither
  // has a handover left.
  if (order.status === "CANCELLED" || order.status === "COMPLETED") return false;

  // Back in stock and settled — nothing left to scan for.
  return order.returnedAt === null;
}
