/**
 * Checks predictive maintenance, availability forecasting and the reminder
 * generator. Run with `npm run verify:insights`.
 */

import { PrismaClient } from "@prisma/client";

import {
  getAvailabilityForecast,
  getMaintenanceSuggestions,
} from "../src/server/services/insights";
import { generateReminders } from "../src/server/services/notifications";

const prisma = new PrismaClient();

let failed = 0;
function check(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${name}  got=${JSON.stringify(got)} want=${JSON.stringify(want)}`
  );
}

async function main() {
  console.log("--- predictive maintenance ---");
  const maintenance = await getMaintenanceSuggestions(20);
  console.log(`  ${maintenance.length} suggestion(s)`);

  check("returns suggestions", maintenance.length > 0, true);
  check(
    "sorted by score, highest first",
    maintenance.every((m, i) => i === 0 || maintenance[i - 1].score >= m.score),
    true
  );
  check(
    "scores stay in range",
    maintenance.every((m) => m.score >= 0 && m.score <= 100),
    true
  );
  check(
    "every suggestion explains itself",
    maintenance.every((m) => m.reasons.length > 0),
    true
  );
  check(
    "urgency matches score",
    maintenance.every(
      (m) =>
        (m.score >= 70 && m.urgency === "due") ||
        (m.score >= 40 && m.score < 70 && m.urgency === "soon") ||
        (m.score < 40 && m.urgency === "ok")
    ),
    true
  );

  if (maintenance[0]) {
    const top = maintenance[0];
    console.log(
      `  top: ${top.name} — score ${top.score} (${top.urgency}) — ${top.reasons.join("; ")}`
    );
  }

  console.log("\n--- availability forecast ---");
  const forecast = await getAvailabilityForecast(20);
  console.log(`  ${forecast.length} constrained product(s)`);

  check(
    "never reports negative availability",
    forecast.every((f) => f.availableNow >= 0),
    true
  );
  check(
    "fully-booked products carry a next-free date or none out",
    forecast.every((f) => f.availableNow > 0 || f.nextFreeAt !== null || f.outOnRental === 0),
    true
  );
  check(
    "available products have no next-free date",
    forecast.every((f) => f.availableNow === 0 || f.nextFreeAt === null),
    true
  );

  console.log("\n--- reminders ---");
  const first = await generateReminders();
  console.log(`  created ${first.total} (due soon ${first.returnDueSoon}, overdue ${first.overdue}, pickups ${first.pickupTomorrow})`);

  const countAfterFirst = await prisma.notification.count();
  check("reminders written", countAfterFirst > 0, true);

  // The whole point of dedupeKey: running again the same day must not spam.
  const second = await generateReminders();
  const countAfterSecond = await prisma.notification.count();
  check("re-running creates nothing new", second.total, 0);
  check("notification count unchanged", countAfterSecond, countAfterFirst);

  const sample = await prisma.notification.findFirst({
    orderBy: { createdAt: "desc" },
  });
  check("notification has a title", Boolean(sample?.title), true);
  check("notification has a body", Boolean(sample?.body), true);
  check("notification starts unread", sample?.readAt, null);

  console.log(`\n${failed === 0 ? "ALL INSIGHT CHECKS PASSED" : `${failed} CHECK(S) FAILED`}`);
  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
