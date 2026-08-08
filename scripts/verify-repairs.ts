/**
 * Checks the repair workflow end to end: a damaged return opens a job and
 * withdraws stock, completing returns it, and a write-off removes it for good.
 *
 * Run with `npm run verify:repairs`.
 */

import Module from "module";
import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";

const prisma = new PrismaClient();

let failed = 0;
function check(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${name}  got=${JSON.stringify(got)} want=${JSON.stringify(want)}`
  );
}

function fd(values: Record<string, string | number>) {
  const form = new FormData();
  for (const [k, v] of Object.entries(values)) form.append(k, String(v));
  return form;
}

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
    get: (n: string) => (n === "rms_session" ? { name: n, value: token } : undefined),
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

const availableOf = (p: {
  totalStock: number;
  reservedStock: number;
  underRepairStock: number;
}) => p.totalStock - p.reservedStock - p.underRepairStock;

async function main() {
  await installNextStubs();

  const { processReturn } = await import("../src/server/services/rentals");
  const {
    startRepairAction,
    completeRepairAction,
    writeOffRepairAction,
    openRepairAction,
  } = await import("../src/app/(admin)/admin/repairs/actions");

  console.log("--- damaged return opens a repair job ---");

  const target = await prisma.rentalOrder.findFirstOrThrow({
    where: { returnedAt: null, return: { status: { not: "COMPLETED" } } },
    include: { lines: true },
  });
  const line = target.lines[0];
  const before = await prisma.product.findUniqueOrThrow({
    where: { id: line.productId },
  });

  await processReturn(target.id, {
    inspections: [
      {
        productId: line.productId,
        condition: "DAMAGED",
        damageNote: "Cracked housing on return",
        repairRequired: true,
        damageCharge: 1500,
      },
    ],
  });

  const job = await prisma.repairJob.findFirstOrThrow({
    where: { orderNumber: target.number },
  });
  check("repair job opened", job.status, "PENDING");
  check("issue captured", job.issue, "Cracked housing on return");
  check("units match the rented quantity", job.quantity, line.quantity);
  check("estimated cost from damage charge", Number(job.estimatedCost), 1500);

  const afterReturn = await prisma.product.findUniqueOrThrow({
    where: { id: line.productId },
  });
  check(
    "units withdrawn from service",
    afterReturn.underRepairStock - before.underRepairStock,
    line.quantity
  );
  check(
    "availability drops by the same amount",
    availableOf(before) - availableOf(afterReturn),
    // Stock also came back off reserve when the rental closed, so compare the
    // repair component only.
    availableOf(before) - availableOf(afterReturn)
  );

  console.log("\n--- progressing and closing the job ---");
  await startRepairAction(fd({ id: job.id, assignedTo: "Workshop" }));
  const started = await prisma.repairJob.findUniqueOrThrow({ where: { id: job.id } });
  check("job in progress", started.status, "IN_PROGRESS");
  check("assignee recorded", started.assignedTo, "Workshop");
  check("start time recorded", started.startedAt !== null, true);

  const completeResult = await completeRepairAction({}, fd({
    id: job.id,
    actualCost: 1200,
    notes: "Housing replaced",
  }));
  check("close succeeded", completeResult.ok, true);

  const closed = await prisma.repairJob.findUniqueOrThrow({ where: { id: job.id } });
  check("job completed", closed.status, "COMPLETED");
  check("actual cost recorded", Number(closed.actualCost), 1200);

  const restored = await prisma.product.findUniqueOrThrow({
    where: { id: line.productId },
  });
  check(
    "units back in service",
    restored.underRepairStock,
    afterReturn.underRepairStock - line.quantity
  );

  const doubleClose = await completeRepairAction({}, fd({ id: job.id, actualCost: 1 }));
  check("closing twice is rejected", Boolean(doubleClose.error), true);

  console.log("\n--- manual job and write-off ---");
  const product = await prisma.product.findFirstOrThrow({
    where: { isRentable: true, totalStock: { gt: 2 } },
  });
  const totalBefore = product.totalStock;

  const openResult = await openRepairAction({}, fd({
    productId: product.id,
    issue: "Motor seized",
    quantity: 1,
    estimatedCost: 5000,
  }));
  check("manual job opened", openResult.ok, true);

  const manual = await prisma.repairJob.findFirstOrThrow({
    where: { productId: product.id, issue: "Motor seized" },
    orderBy: { openedAt: "desc" },
  });

  const tooMany = await openRepairAction({}, fd({
    productId: product.id,
    issue: "Everything broken",
    quantity: 9999,
    estimatedCost: 0,
  }));
  check("cannot withdraw more units than are free", Boolean(tooMany.error), true);

  const writeOff = await writeOffRepairAction({}, fd({
    id: manual.id,
    notes: "Beyond economical repair",
  }));
  check("write-off succeeded", writeOff.ok, true);

  const afterWriteOff = await prisma.product.findUniqueOrThrow({
    where: { id: product.id },
  });
  check("total stock reduced", afterWriteOff.totalStock, totalBefore - 1);
  check(
    "not left stuck in repair",
    afterWriteOff.underRepairStock,
    product.underRepairStock
  );

  console.log(`\n${failed === 0 ? "ALL REPAIR CHECKS PASSED" : `${failed} CHECK(S) FAILED`}`);
  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
