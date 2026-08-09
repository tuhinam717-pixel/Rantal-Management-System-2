import type { OrderStatus } from "@/types";

export type StageState = "done" | "current" | "upcoming" | "skipped";

export interface TrackStage {
  key: string;
  label: string;
  /** What actually happened, shown under the label when known. */
  at?: Date | null;
  state: StageState;
}

/**
 * The happy path a rental walks, in order. Statuses that are not a step —
 * OVERDUE and CANCELLED — are handled as exceptions rather than extra stops,
 * because an overdue rental is still "out with the customer", not somewhere
 * new.
 */
const STEPS: { key: string; label: string; statuses: OrderStatus[] }[] = [
  { key: "confirmed", label: "Booked", statuses: ["DRAFT", "CONFIRMED"] },
  { key: "ready", label: "Ready for pickup", statuses: ["READY_FOR_PICKUP"] },
  { key: "picked", label: "Picked up", statuses: ["PICKED_UP"] },
  { key: "active", label: "With the customer", statuses: ["ACTIVE", "RETURN_DUE", "OVERDUE"] },
  { key: "returned", label: "Returned", statuses: ["RETURNED"] },
  { key: "completed", label: "Settled", statuses: ["COMPLETED"] },
];

/** How far along a rental is, as a list of stages with their state. */
export function orderStages(order: {
  status: string;
  createdAt: Date;
  returnedAt?: Date | null;
  pickup?: { confirmedAt: Date | null } | null;
  return?: { receivedAt: Date | null } | null;
}): TrackStage[] {
  const status = order.status as OrderStatus;

  // A cancelled rental stopped where it stopped; nothing after "Booked"
  // happened, and marking those "upcoming" would imply they still will.
  if (status === "CANCELLED") {
    return STEPS.map((step, index) => ({
      key: step.key,
      label: step.label,
      at: index === 0 ? order.createdAt : null,
      state: index === 0 ? "done" : "skipped",
    }));
  }

  const currentIndex = STEPS.findIndex((s) => s.statuses.includes(status));

  const timeOf = (key: string) => {
    if (key === "confirmed") return order.createdAt;
    if (key === "picked") return order.pickup?.confirmedAt ?? null;
    if (key === "returned") return order.return?.receivedAt ?? order.returnedAt ?? null;
    if (key === "completed") return order.returnedAt ?? null;
    return null;
  };

  return STEPS.map((step, index) => ({
    key: step.key,
    label: step.label,
    at: index <= currentIndex ? timeOf(step.key) : null,
    state:
      currentIndex === -1
        ? "upcoming"
        : index < currentIndex
          ? "done"
          : index === currentIndex
            ? "current"
            : "upcoming",
  }));
}

/** One-line summary of where the rental is, for the top of a track. */
export function trackHeadline(order: {
  status: string;
  rentalEnd: Date;
  returnedAt?: Date | null;
}): { text: string; tone: "neutral" | "good" | "warn" | "bad" } {
  const status = order.status as OrderStatus;

  if (status === "CANCELLED") return { text: "Cancelled", tone: "neutral" };
  if (status === "COMPLETED") return { text: "Settled and closed", tone: "good" };
  if (status === "RETURNED") return { text: "Back in stock, settling", tone: "good" };

  if (!order.returnedAt && order.rentalEnd < new Date()) {
    const days = Math.max(
      1,
      Math.ceil((Date.now() - order.rentalEnd.getTime()) / 86_400_000)
    );
    return {
      text: `Overdue by ${days} day${days === 1 ? "" : "s"}`,
      tone: "bad",
    };
  }

  if (status === "ACTIVE" || status === "RETURN_DUE" || status === "PICKED_UP") {
    return { text: "Out with the customer", tone: "warn" };
  }

  return { text: "Awaiting pickup", tone: "neutral" };
}
