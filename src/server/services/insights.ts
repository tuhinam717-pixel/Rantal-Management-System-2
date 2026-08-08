import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * Predictive maintenance and availability forecasting.
 *
 * Both are derived from rental history that already exists — no extra tracking
 * and no hardware. The maintenance score is a heuristic, not a physics model:
 * it ranks what a human should look at first, and says why.
 */

/** Rentals a unit can absorb before a service is worth booking. */
const SERVICE_INTERVAL_RENTALS = 12;
/** Days on hire that count as equivalent wear. */
const SERVICE_INTERVAL_DAYS = 90;

export type MaintenanceUrgency = "due" | "soon" | "ok";

export interface MaintenanceSuggestion {
  productId: string;
  name: string;
  sku: string;
  rentalsSinceService: number;
  daysOnHire: number;
  damageIncidents: number;
  lastServicedAt: Date | null;
  /** 0-100. Higher means service it sooner. */
  score: number;
  urgency: MaintenanceUrgency;
  reasons: string[];
}

export async function getMaintenanceSuggestions(
  limit = 12
): Promise<MaintenanceSuggestion[]> {
  const [products, completedRepairs] = await Promise.all([
    prisma.product.findMany({
      where: { isRentable: true },
      select: {
        id: true,
        name: true,
        sku: true,
        orderLines: {
          select: {
            quantity: true,
            order: {
              select: { rentalStart: true, rentalEnd: true, returnedAt: true },
            },
          },
        },
      },
    }),
    // The clock resets at the last completed service.
    prisma.repairJob.findMany({
      where: { status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      select: { productId: true, completedAt: true },
    }),
  ]);

  const lastService = new Map<string, Date>();
  for (const repair of completedRepairs) {
    if (repair.completedAt && !lastService.has(repair.productId)) {
      lastService.set(repair.productId, repair.completedAt);
    }
  }

  // Damage incidents per product, counted from return inspections.
  const inspections = await prisma.returnInspection.findMany({
    where: { condition: { not: "GOOD" } },
    select: { productId: true, inspectedAt: true },
  });

  const damageByProduct = new Map<string, { total: number; since: number }>();
  for (const inspection of inspections) {
    const serviced = lastService.get(inspection.productId);
    const entry = damageByProduct.get(inspection.productId) ?? {
      total: 0,
      since: 0,
    };
    entry.total += 1;
    if (!serviced || inspection.inspectedAt > serviced) entry.since += 1;
    damageByProduct.set(inspection.productId, entry);
  }

  const suggestions = products.map((product) => {
    const serviced = lastService.get(product.id) ?? null;

    let rentalsSinceService = 0;
    let daysOnHire = 0;

    for (const line of product.orderLines) {
      const start = line.order.rentalStart;
      if (serviced && start <= serviced) continue;

      rentalsSinceService += line.quantity;

      const end = line.order.returnedAt ?? line.order.rentalEnd;
      const days = Math.max(
        1,
        Math.round((end.getTime() - start.getTime()) / 86_400_000)
      );
      daysOnHire += days * line.quantity;
    }

    const damage = damageByProduct.get(product.id) ?? { total: 0, since: 0 };

    // Three signals, capped so one runaway number can't dominate the ranking.
    const rentalLoad = Math.min(1, rentalsSinceService / SERVICE_INTERVAL_RENTALS);
    const timeLoad = Math.min(1, daysOnHire / SERVICE_INTERVAL_DAYS);
    const damageLoad = Math.min(1, damage.since / 3);

    const score = Math.round(
      (rentalLoad * 0.4 + timeLoad * 0.3 + damageLoad * 0.3) * 100
    );

    const reasons: string[] = [];
    if (rentalsSinceService >= SERVICE_INTERVAL_RENTALS) {
      reasons.push(`${rentalsSinceService} rentals since last service`);
    } else if (rentalLoad > 0.6) {
      reasons.push(`${rentalsSinceService} rentals — nearing the service interval`);
    }
    if (daysOnHire >= SERVICE_INTERVAL_DAYS) {
      reasons.push(`${daysOnHire} days on hire`);
    }
    if (damage.since > 0) {
      reasons.push(
        `${damage.since} damaged return${damage.since === 1 ? "" : "s"} since service`
      );
    }
    if (!serviced && rentalsSinceService > 0) {
      reasons.push("Never serviced");
    }

    const urgency: MaintenanceUrgency =
      score >= 70 ? "due" : score >= 40 ? "soon" : "ok";

    return {
      productId: product.id,
      name: product.name,
      sku: product.sku,
      rentalsSinceService,
      daysOnHire,
      damageIncidents: damage.total,
      lastServicedAt: serviced,
      score,
      urgency,
      reasons,
    };
  });

  return suggestions
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export interface AvailabilityForecast {
  productId: string;
  name: string;
  sku: string;
  totalStock: number;
  outOnRental: number;
  underRepair: number;
  availableNow: number;
  /** When the first unit comes back, if nothing is free right now. */
  nextFreeAt: Date | null;
  /** Bookings starting in the next fortnight. */
  upcomingBookings: number;
}

/**
 * What is free now, and when the fully-booked products free up.
 *
 * Answers the question a counter actually gets asked: "you're out of these —
 * when can I have one?"
 */
export async function getAvailabilityForecast(
  limit = 12,
  now = new Date()
): Promise<AvailabilityForecast[]> {
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + 14);

  const products = await prisma.product.findMany({
    where: { isRentable: true },
    select: {
      id: true,
      name: true,
      sku: true,
      totalStock: true,
      reservedStock: true,
      underRepairStock: true,
      orderLines: {
        where: {
          order: {
            returnedAt: null,
            status: { notIn: ["COMPLETED", "CANCELLED"] },
          },
        },
        select: {
          quantity: true,
          order: { select: { rentalEnd: true, rentalStart: true } },
        },
      },
    },
  });

  const rows = products.map((product) => {
    const outOnRental = product.orderLines
      .filter((l) => l.order.rentalStart <= now)
      .reduce((sum, l) => sum + l.quantity, 0);

    const upcomingBookings = product.orderLines.filter(
      (l) => l.order.rentalStart > now && l.order.rentalStart <= horizon
    ).length;

    const availableNow = Math.max(
      0,
      product.totalStock - product.reservedStock - product.underRepairStock
    );

    // Earliest return among what's currently out.
    const nextFreeAt =
      availableNow > 0
        ? null
        : product.orderLines
            .map((l) => l.order.rentalEnd)
            .sort((a, b) => a.getTime() - b.getTime())[0] ?? null;

    return {
      productId: product.id,
      name: product.name,
      sku: product.sku,
      totalStock: product.totalStock,
      outOnRental,
      underRepair: product.underRepairStock,
      availableNow,
      nextFreeAt,
      upcomingBookings,
    };
  });

  // Fully-booked products first — those are the ones staff need an answer for.
  return rows
    .filter((r) => r.availableNow === 0 || r.upcomingBookings > 0)
    .sort((a, b) => a.availableNow - b.availableNow || b.outOnRental - a.outOnRental)
    .slice(0, limit);
}
