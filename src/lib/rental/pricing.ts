import type { DepositType, RentalUnit } from "@prisma/client";

/**
 * Rental money rules, in one place.
 *
 * Deliberately pure: no Prisma, no `Date.now()`. Callers pass the numbers in,
 * which keeps this unit-testable and safe to import from client components.
 */

const MS_PER_HOUR = 60 * 60 * 1000;

const HOURS_PER_UNIT: Record<RentalUnit, number> = {
  HOUR: 1,
  DAY: 24,
  WEEK: 24 * 7,
  MONTH: 24 * 30,
};

/**
 * How many chargeable units a rental spans.
 *
 * Always rounds up and never returns less than 1: half a day of a daily rental
 * is still a day, which is how rental businesses actually bill.
 */
export function billableUnits(
  start: Date,
  end: Date,
  unit: RentalUnit,
  duration = 1
): number {
  const hours = (end.getTime() - start.getTime()) / MS_PER_HOUR;
  if (!Number.isFinite(hours) || hours <= 0) return 1;

  const hoursPerBlock = HOURS_PER_UNIT[unit] * Math.max(1, duration);
  // Epsilon guard so an exact 72h daily rental bills 3 days, not 4.
  return Math.max(1, Math.ceil(hours / hoursPerBlock - 1e-9));
}

/** Line rent before deposit: unit price × units × quantity. */
export function lineRent(
  unitPrice: number,
  units: number,
  quantity: number
): number {
  return round2(unitPrice * units * quantity);
}

/**
 * Deposit for a line.
 *
 * FIXED      -> `value` per unit of quantity (a deposit per item held).
 * PERCENTAGE -> `value`% of the line's rent.
 */
export function lineDeposit(
  type: DepositType,
  value: number,
  quantity: number,
  rent: number
): number {
  if (type === "PERCENTAGE") return round2((rent * value) / 100);
  return round2(value * quantity);
}

/**
 * Late fee for an overdue return.
 *
 * Overdue time inside the grace window is free. Beyond it, whole units are
 * charged (part of a day is a full day), capped at `maxAmount` when set.
 */
export function lateFee({
  dueAt,
  returnedAt,
  unit,
  amountPerUnit,
  graceHours = 0,
  maxAmount,
}: {
  dueAt: Date;
  returnedAt: Date;
  unit: RentalUnit;
  amountPerUnit: number;
  graceHours?: number;
  maxAmount?: number | null;
}): { overdueUnits: number; amount: number } {
  const overdueHours =
    (returnedAt.getTime() - dueAt.getTime()) / MS_PER_HOUR - graceHours;

  if (!Number.isFinite(overdueHours) || overdueHours <= 0) {
    return { overdueUnits: 0, amount: 0 };
  }

  const overdueUnits = Math.ceil(overdueHours / HOURS_PER_UNIT[unit]);
  const raw = overdueUnits * amountPerUnit;

  return {
    overdueUnits,
    amount: round2(maxAmount != null ? Math.min(raw, maxAmount) : raw),
  };
}

/**
 * Splits a deposit at settlement time.
 *
 * Straight from the brief: on-time returns get everything back; a late return
 * has the penalty deducted and the remainder refunded in cash. A penalty larger
 * than the deposit can't produce a negative refund.
 */
export function settleDeposit(
  depositAmount: number,
  penalty: number
): { deducted: number; refunded: number; shortfall: number } {
  const deducted = round2(Math.min(depositAmount, Math.max(0, penalty)));
  return {
    deducted,
    refunded: round2(depositAmount - deducted),
    shortfall: round2(Math.max(0, penalty - depositAmount)),
  };
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** "3 days", "1 day", "12 hours" — for durations shown next to a date range. */
export function formatDuration(units: number, unit: RentalUnit): string {
  const noun = unit.toLowerCase();
  return `${units} ${noun}${units === 1 ? "" : "s"}`;
}
