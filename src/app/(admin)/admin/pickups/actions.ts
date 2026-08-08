"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";

import { requireRole } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { confirmPickup } from "@/server/services/rentals";
import {
  checklistProgress,
  defaultChecklist,
  parseChecklist,
  type ChecklistItem,
} from "@/lib/rental/pickup-checklist";

export type PickupState = { error?: string; ok?: boolean };

function refresh() {
  revalidatePath("/admin/pickups");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/orders");
}

/** Ticks or unticks checklist items without confirming the pickup. */
export async function saveChecklistAction(
  pickupId: string,
  doneIds: string[]
): Promise<PickupState> {
  await requireRole("ADMIN");

  const pickup = await prisma.pickup.findUnique({ where: { id: pickupId } });
  if (!pickup) return { error: "Pickup not found." };

  const items: ChecklistItem[] = defaultChecklist().map((item) => ({
    ...item,
    done: doneIds.includes(item.id),
  }));

  await prisma.pickup.update({
    where: { id: pickupId },
    data: { checklist: items as unknown as Prisma.InputJsonValue },
  });

  refresh();
  return { ok: true };
}

/**
 * Confirms the handover, but only once the required checklist items are
 * ticked. Gating here rather than in the UI alone means the rule holds even if
 * the request is replayed.
 */
export async function confirmPickupWithChecklistAction(
  pickupId: string,
  doneIds: string[]
): Promise<PickupState> {
  await requireRole("ADMIN");

  const pickup = await prisma.pickup.findUnique({ where: { id: pickupId } });
  if (!pickup) return { error: "Pickup not found." };
  if (pickup.status === "COMPLETED") {
    return { error: "This pickup has already been confirmed." };
  }

  const items = defaultChecklist().map((item) => ({
    ...item,
    done: doneIds.includes(item.id),
  }));

  const progress = checklistProgress(items);
  if (!progress.complete) {
    const missing = items
      .filter((i) => i.required && !i.done)
      .map((i) => i.label)
      .join(", ");
    return { error: `Still to check: ${missing}` };
  }

  await prisma.pickup.update({
    where: { id: pickupId },
    data: { checklist: items as unknown as Prisma.InputJsonValue },
  });

  await confirmPickup(pickup.orderId, "Checklist completed at handover");

  refresh();
  return { ok: true };
}

// ---------------------------------------------------------------- route

/** Moves a stop up or down, swapping sequence numbers with its neighbour. */
export async function moveStopAction(formData: FormData) {
  await requireRole("ADMIN");

  const id = String(formData.get("id") ?? "");
  const direction = String(formData.get("direction") ?? "");
  const day = String(formData.get("day") ?? "");
  if (!id || !day) return;

  const { start, end } = dayBounds(day);

  const stops = await prisma.pickup.findMany({
    where: { scheduledFor: { gte: start, lt: end }, status: { not: "COMPLETED" } },
    orderBy: [{ routeSequence: "asc" }, { scheduledFor: "asc" }],
    select: { id: true },
  });

  const index = stops.findIndex((s) => s.id === id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || target < 0 || target >= stops.length) return;

  const reordered = [...stops];
  [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

  // Rewrite the whole day's sequence: swapping two numbers leaves gaps and
  // duplicates behind when the existing values aren't already 1..n.
  await prisma.$transaction(
    reordered.map((stop, i) =>
      prisma.pickup.update({
        where: { id: stop.id },
        data: { routeSequence: i + 1 },
      })
    )
  );

  refresh();
}

/** Numbers the day's stops 1..n in scheduled-time order. */
export async function autoSequenceAction(formData: FormData) {
  await requireRole("ADMIN");

  const day = String(formData.get("day") ?? "");
  if (!day) return;

  const { start, end } = dayBounds(day);

  const stops = await prisma.pickup.findMany({
    where: { scheduledFor: { gte: start, lt: end }, status: { not: "COMPLETED" } },
    orderBy: { scheduledFor: "asc" },
    select: { id: true },
  });

  await prisma.$transaction(
    stops.map((stop, i) =>
      prisma.pickup.update({
        where: { id: stop.id },
        data: { routeSequence: i + 1 },
      })
    )
  );

  refresh();
}

export async function assignTeamAction(formData: FormData) {
  await requireRole("ADMIN");

  const id = String(formData.get("id") ?? "");
  const team = String(formData.get("assignedTo") ?? "").trim();
  if (!id) return;

  await prisma.pickup.update({
    where: { id },
    data: { assignedTo: team || null },
  });

  refresh();
}

/** Assigns every unassigned stop on the day to one team in a single move. */
export async function assignDayAction(formData: FormData) {
  await requireRole("ADMIN");

  const day = String(formData.get("day") ?? "");
  const team = String(formData.get("assignedTo") ?? "").trim();
  if (!day || !team) return;

  const { start, end } = dayBounds(day);

  await prisma.pickup.updateMany({
    where: { scheduledFor: { gte: start, lt: end }, status: { not: "COMPLETED" } },
    data: { assignedTo: team },
  });

  refresh();
}

/** Local-day window for a `YYYY-MM-DD` string. */
function dayBounds(day: string) {
  const start = new Date(`${day}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export async function getChecklist(pickupId: string) {
  const pickup = await prisma.pickup.findUnique({
    where: { id: pickupId },
    select: { checklist: true },
  });
  return parseChecklist(pickup?.checklist);
}
