/**
 * Checks the scan-code round trip and that a scanned code resolves to the
 * right next action. Run with `npm run verify:scan`.
 */

import Module from "module";
import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";

import { buildScanCode, parseScanCode } from "../src/lib/rental/scan-code";

const prisma = new PrismaClient();

let failed = 0;
function check(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${name}  got=${JSON.stringify(got)} want=${JSON.stringify(want)}`
  );
}

/** Same stubs as verify-crud: server actions need a Next request context. */
async function installNextStubs() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET must be set");

  const admin = await prisma.user.findFirstOrThrow({ where: { role: "ADMIN" } });
  const token = await new SignJWT({
    email: admin.email,
    name: admin.name,
    role: admin.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(admin.id)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + 3600)
    .sign(new TextEncoder().encode(secret));

  const cookieStore = {
    get: (name: string) => (name === "rms_session" ? { name, value: token } : undefined),
    set: () => {},
    delete: () => {},
  };

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const loader = Module as unknown as {
    _load: (r: string, p: unknown, m: boolean) => any;
  };
  const original = loader._load;
  loader._load = function (request: string, parent: unknown, isMain: boolean) {
    if (request === "next/cache") return { revalidatePath: () => {}, revalidateTag: () => {} };
    if (request === "next/navigation") {
      return {
        redirect: (url: string) => {
          const e = new Error("NEXT_REDIRECT") as Error & { digest: string };
          e.digest = `NEXT_REDIRECT;${url}`;
          throw e;
        },
        notFound: () => { throw new Error("NEXT_NOT_FOUND"); },
      };
    }
    if (request === "next/headers") {
      return { cookies: async () => cookieStore, headers: async () => new Map() };
    }
    return original.call(this, request, parent, isMain);
  };
}

async function main() {
  console.log("--- code format ---");
  check("builds prefixed code", buildScanCode("RO-2026-0001"), "RENTFLOW:RO-2026-0001");
  check("parses full payload", parseScanCode("RENTFLOW:RO-2026-0001"), "RO-2026-0001");
  check("parses bare number", parseScanCode("RO-2026-0001"), "RO-2026-0001");
  check("tolerates lowercase and spaces", parseScanCode("  rentflow:ro-2026-0001 "), "RO-2026-0001");
  check("accepts quotation numbers", parseScanCode("QT-2026-0001"), "QT-2026-0001");
  check("rejects junk", parseScanCode("hello world"), null);
  check("rejects wrong shape", parseScanCode("RO-26-1"), null);
  check("rejects empty", parseScanCode("   "), null);

  console.log("\n--- lookup resolves the right next action ---");
  await installNextStubs();
  const { lookupScanAction } = await import("../src/app/(admin)/admin/scan/actions");

  const bad = await lookupScanAction("not-a-code");
  check("unparseable code rejected", Boolean(bad.error), true);

  const missing = await lookupScanAction("RO-1999-9999");
  check("unknown order rejected", Boolean(missing.error), true);

  // An order still awaiting pickup should offer PICKUP.
  const awaitingPickup = await prisma.rentalOrder.findFirst({
    where: { returnedAt: null, pickup: { status: { not: "COMPLETED" } } },
    select: { number: true },
  });
  if (awaitingPickup) {
    const r = await lookupScanAction(buildScanCode(awaitingPickup.number));
    check("pickup pending -> PICKUP", r.order?.nextAction, "PICKUP");
  } else {
    console.log("SKIP  no order awaiting pickup in this dataset");
  }

  // Picked up but not returned should offer RETURN.
  const awaitingReturn = await prisma.rentalOrder.findFirst({
    where: {
      returnedAt: null,
      pickup: { status: "COMPLETED" },
      return: { status: { not: "COMPLETED" } },
    },
    select: { number: true },
  });
  if (awaitingReturn) {
    const r = await lookupScanAction(buildScanCode(awaitingReturn.number));
    check("return pending -> RETURN", r.order?.nextAction, "RETURN");
    check("deposit surfaced", (r.order?.depositAmount ?? 0) > 0, true);
  } else {
    console.log("SKIP  no order awaiting return in this dataset");
  }

  // Settled orders should offer nothing.
  const settled = await prisma.rentalOrder.findFirst({
    where: { returnedAt: { not: null } },
    select: { number: true },
  });
  if (settled) {
    const r = await lookupScanAction(buildScanCode(settled.number));
    check("settled order -> NONE", r.order?.nextAction, "NONE");
  }

  console.log(`\n${failed === 0 ? "ALL SCAN CHECKS PASSED" : `${failed} CHECK(S) FAILED`}`);
  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
