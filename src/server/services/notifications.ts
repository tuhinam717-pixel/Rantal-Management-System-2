import "server-only";

import type { NotificationKind, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";

/**
 * Automatic customer reminders.
 *
 * Written in-app rather than emailed, so the feature works without an email
 * provider — the same rows would become the send queue if one is added later.
 *
 * `dedupeKey` is unique and includes the day, which makes the generator safe
 * to run as often as you like: a second run the same day is a no-op instead of
 * spamming the customer.
 */

const DAY = 86_400_000;

function dayStamp(d: Date) {
  return d.toISOString().slice(0, 10);
}

export interface ReminderRun {
  returnDueSoon: number;
  overdue: number;
  pickupTomorrow: number;
  total: number;
}

export async function generateReminders(now = new Date()): Promise<ReminderRun> {
  const today = dayStamp(now);
  const soonCutoff = new Date(now.getTime() + 2 * DAY);
  const tomorrowStart = new Date(now.getTime() + DAY);
  tomorrowStart.setHours(0, 0, 0, 0);
  const tomorrowEnd = new Date(tomorrowStart.getTime() + DAY);

  const rows: Prisma.NotificationCreateManyInput[] = [];

  const push = (
    userId: string,
    kind: NotificationKind,
    subject: string,
    title: string,
    body: string,
    orderId?: string
  ) => {
    rows.push({
      userId,
      kind,
      title,
      body,
      orderId,
      dedupeKey: `${kind}:${subject}:${today}`,
    });
  };

  // ---- returns due in the next two days ---------------------------------
  const dueSoon = await prisma.rentalOrder.findMany({
    where: {
      returnedAt: null,
      rentalEnd: { gte: now, lte: soonCutoff },
      status: { notIn: ["COMPLETED", "CANCELLED"] },
    },
    include: {
      customer: { select: { id: true } },
      deposit: { select: { amount: true } },
    },
  });

  for (const order of dueSoon) {
    push(
      order.customer.id,
      "RETURN_DUE_SOON",
      order.id,
      `Return ${order.number} by ${formatDate(order.rentalEnd)}`,
      `Bring the items back on time and your ${formatCurrency(
        Number(order.deposit?.amount ?? 0)
      )} deposit is refunded in full. Late returns have a penalty deducted from it.`,
      order.id
    );
  }

  // ---- already overdue ---------------------------------------------------
  const overdue = await prisma.rentalOrder.findMany({
    where: {
      returnedAt: null,
      rentalEnd: { lt: now },
      status: { notIn: ["COMPLETED", "CANCELLED"] },
    },
    include: {
      customer: { select: { id: true } },
      deposit: { select: { amount: true } },
    },
  });

  for (const order of overdue) {
    const daysLate = Math.max(
      1,
      Math.ceil((now.getTime() - order.rentalEnd.getTime()) / DAY)
    );
    push(
      order.customer.id,
      "RETURN_OVERDUE",
      order.id,
      `${order.number} is ${daysLate} day${daysLate === 1 ? "" : "s"} overdue`,
      `A late-return penalty is accruing and will be deducted from your ${formatCurrency(
        Number(order.deposit?.amount ?? 0)
      )} deposit. Please return the items as soon as you can.`,
      order.id
    );
  }

  // ---- pickups tomorrow --------------------------------------------------
  const pickups = await prisma.pickup.findMany({
    where: {
      status: { not: "COMPLETED" },
      scheduledFor: { gte: tomorrowStart, lt: tomorrowEnd },
    },
    include: {
      order: {
        include: { customer: { select: { id: true } } },
      },
    },
  });

  for (const pickup of pickups) {
    push(
      pickup.order.customer.id,
      "PICKUP_TOMORROW",
      pickup.id,
      `Your rental ${pickup.order.number} is ready tomorrow`,
      `Collection is scheduled for ${formatDate(
        pickup.scheduledFor
      )}. Bring photo ID — we check it at handover.`,
      pickup.orderId
    );
  }

  // skipDuplicates leans on the unique dedupeKey, so re-running is harmless.
  const created = await prisma.notification.createMany({
    data: rows,
    skipDuplicates: true,
  });

  return {
    returnDueSoon: dueSoon.length,
    overdue: overdue.length,
    pickupTomorrow: pickups.length,
    total: created.count,
  };
}

export async function getNotifications(userId: string, limit = 20) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getUnreadCount(userId: string) {
  return prisma.notification.count({ where: { userId, readAt: null } });
}
