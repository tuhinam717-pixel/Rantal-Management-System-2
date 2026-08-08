import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type { DashboardKpisVM } from "@/types";

const ACTIVE_STATUSES = [
  "CONFIRMED",
  "READY_FOR_PICKUP",
  "PICKED_UP",
  "ACTIVE",
  "RETURN_DUE",
] as const;

function dayBounds(now: Date) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

/** The eight tiles the brief asks for, in one round of queries. */
export async function getDashboardKpis(now = new Date()): Promise<DashboardKpisVM> {
  const { start: todayStart, end: todayEnd } = dayBounds(now);
  const weekAhead = new Date(todayStart);
  weekAhead.setDate(weekAhead.getDate() + 7);

  const [
    activeRentals,
    dueToday,
    upcomingPickups,
    upcomingReturns,
    overdueRentals,
    revenue,
    depositsHeld,
    lateFees,
  ] = await Promise.all([
    prisma.rentalOrder.count({
      where: { status: { in: [...ACTIVE_STATUSES] } },
    }),
    prisma.rentalOrder.count({
      where: {
        status: { in: [...ACTIVE_STATUSES] },
        rentalEnd: { gte: todayStart, lt: todayEnd },
      },
    }),
    prisma.pickup.count({
      where: {
        status: { in: ["SCHEDULED", "IN_TRANSIT"] },
        scheduledFor: { gte: todayStart, lt: weekAhead },
      },
    }),
    prisma.return.count({
      where: {
        status: "SCHEDULED",
        scheduledFor: { gte: todayStart, lt: weekAhead },
      },
    }),
    // Past its return date, not yet handed back.
    prisma.rentalOrder.count({
      where: {
        status: { in: [...ACTIVE_STATUSES, "OVERDUE"] },
        rentalEnd: { lt: now },
        returnedAt: null,
      },
    }),
    prisma.payment.aggregate({
      where: { purpose: "RENTAL", status: "PAID" },
      _sum: { amount: true },
    }),
    // Money we're holding: collected, minus anything already deducted or refunded.
    prisma.securityDeposit.aggregate({
      where: { status: { in: ["COLLECTED", "HELD", "PARTIALLY_REFUNDED"] } },
      _sum: { amount: true, deductedAmount: true, refundedAmount: true },
    }),
    prisma.lateFee.aggregate({
      where: { status: { in: ["DEDUCTED_FROM_DEPOSIT", "PAID"] } },
      _sum: { amount: true },
    }),
  ]);

  const held =
    Number(depositsHeld._sum.amount ?? 0) -
    Number(depositsHeld._sum.deductedAmount ?? 0) -
    Number(depositsHeld._sum.refundedAmount ?? 0);

  return {
    activeRentals,
    dueToday,
    upcomingPickups,
    upcomingReturns,
    overdueRentals,
    rentalRevenue: Number(revenue._sum.amount ?? 0),
    depositsHeld: Math.max(0, held),
    lateFeesCollected: Number(lateFees._sum.amount ?? 0),
  };
}

/**
 * The portal equivalent of {@link getDashboardKpis}, scoped to one customer.
 *
 * Payments and deposits hang off the order rather than the user, so both are
 * filtered through `order.customerId` instead of a direct column.
 */
export async function getCustomerDashboard(userId: string, now = new Date()) {
  const { start: todayStart } = dayBounds(now);
  const weekAhead = new Date(todayStart);
  weekAhead.setDate(weekAhead.getDate() + 7);

  const openOrder: Prisma.RentalOrderWhereInput = {
    customerId: userId,
    status: { notIn: ["COMPLETED", "CANCELLED", "RETURNED"] },
  };

  const [
    activeRentals,
    overdueRentals,
    returningSoon,
    deposits,
    spend,
    upcoming,
    recent,
  ] = await Promise.all([
    prisma.rentalOrder.count({
      where: { customerId: userId, status: { in: [...ACTIVE_STATUSES] } },
    }),
    prisma.rentalOrder.count({
      where: { ...openOrder, rentalEnd: { lt: now }, returnedAt: null },
    }),
    prisma.rentalOrder.count({
      where: {
        ...openOrder,
        returnedAt: null,
        rentalEnd: { gte: now, lt: weekAhead },
      },
    }),
    prisma.securityDeposit.aggregate({
      where: {
        order: { customerId: userId },
        status: { in: ["COLLECTED", "HELD", "PARTIALLY_REFUNDED"] },
      },
      _sum: { amount: true, deductedAmount: true, refundedAmount: true },
    }),
    prisma.payment.aggregate({
      where: {
        order: { customerId: userId },
        purpose: "RENTAL",
        status: "PAID",
      },
      _sum: { amount: true },
    }),
    // What the customer has to act on: the next returns falling due.
    prisma.rentalOrder.findMany({
      where: { ...openOrder, returnedAt: null },
      orderBy: { rentalEnd: "asc" },
      take: 4,
      include: { lines: { include: { product: { select: { name: true } } } } },
    }),
    prisma.rentalOrder.findMany({
      where: { customerId: userId },
      orderBy: { createdAt: "desc" },
      take: 4,
      include: { lines: { include: { product: { select: { name: true } } } } },
    }),
  ]);

  const held =
    Number(deposits._sum.amount ?? 0) -
    Number(deposits._sum.deductedAmount ?? 0) -
    Number(deposits._sum.refundedAmount ?? 0);

  return {
    activeRentals,
    overdueRentals,
    returningSoon,
    depositsHeld: Math.max(0, held),
    totalSpent: Number(spend._sum.amount ?? 0),
    upcoming,
    recent,
  };
}

/** The "act on this now" lists that sit under the tiles. */
export async function getDashboardQueues(now = new Date()) {
  const { start: todayStart, end: todayEnd } = dayBounds(now);

  const [overdue, pickupsToday, returnsToday] = await Promise.all([
    prisma.rentalOrder.findMany({
      where: { rentalEnd: { lt: now }, returnedAt: null, status: { notIn: ["COMPLETED", "CANCELLED", "RETURNED"] } },
      orderBy: { rentalEnd: "asc" },
      take: 5,
      include: { customer: { select: { name: true } } },
    }),
    prisma.pickup.findMany({
      where: { scheduledFor: { gte: todayStart, lt: todayEnd } },
      orderBy: [{ routeSequence: "asc" }, { scheduledFor: "asc" }],
      take: 5,
      include: {
        order: { include: { customer: { select: { name: true } } } },
      },
    }),
    prisma.return.findMany({
      where: { scheduledFor: { gte: todayStart, lt: todayEnd } },
      orderBy: { scheduledFor: "asc" },
      take: 5,
      include: {
        order: { include: { customer: { select: { name: true } } } },
      },
    }),
  ]);

  return { overdue, pickupsToday, returnsToday };
}
