import "server-only";

import { prisma } from "@/lib/prisma";

/** A tracker that has not reported for this long is treated as offline. */
export const OFFLINE_AFTER_MINUTES = 90;

export interface TelemetryInput {
  deviceId: string;
  latitude?: number;
  longitude?: number;
  batteryPct?: number;
}

/**
 * Record one reading from a tracker.
 *
 * The device row is the current state and `TrackerPing` is the history, so the
 * admin list stays a single cheap query no matter how chatty the fleet gets.
 * Unknown device ids are rejected rather than auto-registered — a tag has to be
 * paired to a product first, otherwise a typo silently creates an orphan.
 */
export async function recordTelemetry(input: TelemetryInput) {
  const tracker = await prisma.assetTracker.findUnique({
    where: { deviceId: input.deviceId },
    select: { id: true },
  });

  if (!tracker) return null;

  const reading = {
    batteryPct: input.batteryPct ?? null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
  };

  const [updated] = await prisma.$transaction([
    prisma.assetTracker.update({
      where: { id: tracker.id },
      data: { ...reading, lastSeenAt: new Date() },
    }),
    prisma.trackerPing.create({
      data: { trackerId: tracker.id, ...reading },
    }),
  ]);

  return updated;
}

export async function listTrackers(now = new Date()) {
  const trackers = await prisma.assetTracker.findMany({
    orderBy: [{ lastSeenAt: "desc" }, { deviceId: "asc" }],
    include: {
      product: { select: { name: true, sku: true } },
      order: { select: { id: true, number: true } },
    },
  });

  const cutoff = new Date(now.getTime() - OFFLINE_AFTER_MINUTES * 60_000);

  return trackers.map((tracker) => ({
    ...tracker,
    offline: !tracker.lastSeenAt || tracker.lastSeenAt < cutoff,
    lowBattery: tracker.batteryPct != null && tracker.batteryPct <= 20,
  }));
}

export async function getTrackerSummary(now = new Date()) {
  const cutoff = new Date(now.getTime() - OFFLINE_AFTER_MINUTES * 60_000);

  const [total, outOnRent, missing, offline, lowBattery] = await Promise.all([
    prisma.assetTracker.count(),
    prisma.assetTracker.count({ where: { status: "OUT_ON_RENT" } }),
    prisma.assetTracker.count({ where: { status: "MISSING" } }),
    prisma.assetTracker.count({
      where: { OR: [{ lastSeenAt: null }, { lastSeenAt: { lt: cutoff } }] },
    }),
    prisma.assetTracker.count({ where: { batteryPct: { lte: 20 } } }),
  ]);

  return { total, outOnRent, missing, offline, lowBattery };
}
