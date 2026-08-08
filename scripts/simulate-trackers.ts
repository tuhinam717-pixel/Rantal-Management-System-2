/**
 * Pair a few trackers and push telemetry at them, so asset tracking can be
 * demonstrated without real hardware.
 *
 *   npx tsx scripts/simulate-trackers.ts               # seed + one round
 *   npx tsx scripts/simulate-trackers.ts --rounds 5    # keep them moving
 *
 * Reads DATABASE_URL for pairing and posts to APP_URL/api/iot/telemetry using
 * IOT_INGEST_KEY, which is exactly what a real device would do.
 */
import { PrismaClient, type TrackerStatus } from "@prisma/client";

const prisma = new PrismaClient();

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";
const INGEST_KEY = process.env.IOT_INGEST_KEY;

/** Warehouse in Mumbai; units drift a few hundred metres around the city. */
const BASE = { lat: 19.076, lng: 72.8777 };

const FLEET: { deviceId: string; label: string; status: TrackerStatus }[] = [
  { deviceId: "TRK-0001", label: "Body no. 1", status: "OUT_ON_RENT" },
  { deviceId: "TRK-0002", label: "Body no. 2", status: "IDLE" },
  { deviceId: "TRK-0003", label: "Drone A", status: "IN_TRANSIT" },
  { deviceId: "TRK-0004", label: "Drone B", status: "OUT_ON_RENT" },
  { deviceId: "TRK-0005", label: "Lighting kit", status: "IDLE" },
];

function jitter(base: number, spread = 0.05) {
  return base + (Math.random() - 0.5) * spread;
}

async function pair() {
  const products = await prisma.product.findMany({
    orderBy: { name: "asc" },
    take: FLEET.length,
    select: { id: true, name: true },
  });

  if (products.length === 0) {
    throw new Error("No products found — run the seed first.");
  }

  for (const [index, tag] of FLEET.entries()) {
    const product = products[index % products.length];

    await prisma.assetTracker.upsert({
      where: { deviceId: tag.deviceId },
      update: { label: tag.label, status: tag.status },
      create: {
        deviceId: tag.deviceId,
        label: tag.label,
        status: tag.status,
        productId: product.id,
      },
    });

    console.log(`paired ${tag.deviceId} → ${product.name}`);
  }
}

async function pushRound(round: number) {
  for (const tag of FLEET) {
    const body = {
      deviceId: tag.deviceId,
      latitude: Number(jitter(BASE.lat).toFixed(5)),
      longitude: Number(jitter(BASE.lng).toFixed(5)),
      batteryPct: Math.max(5, 95 - round * 3 - Math.floor(Math.random() * 8)),
    };

    const response = await fetch(`${APP_URL}/api/iot/telemetry`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(INGEST_KEY ? { Authorization: `Bearer ${INGEST_KEY}` } : {}),
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    console.log(`  ${tag.deviceId} → ${response.status} ${text}`);
  }
}

async function main() {
  const roundsArg = process.argv.indexOf("--rounds");
  const rounds = roundsArg === -1 ? 1 : Number(process.argv[roundsArg + 1]) || 1;

  console.log(`Pairing ${FLEET.length} trackers…`);
  await pair();

  console.log(`\nPosting telemetry to ${APP_URL}`);
  for (let round = 0; round < rounds; round++) {
    console.log(`round ${round + 1}/${rounds}`);
    await pushRound(round);
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
