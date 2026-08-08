/**
 * End-to-end sanity check: pricing maths, then a real cart -> checkout run
 * against the database. Run with `npx tsx scripts/verify-flow.ts`.
 */

import { PrismaClient } from "@prisma/client";

import { billableUnits, lateFee, settleDeposit } from "../src/lib/rental/pricing";

const prisma = new PrismaClient();
const d = (s: string) => new Date(s);

let failed = 0;
function check(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}  got=${JSON.stringify(got)} want=${JSON.stringify(want)}`);
}

async function main() {
  console.log("--- pricing engine ---");
  check("72h daily = 3 days", billableUnits(d("2026-08-01T10:00Z"), d("2026-08-04T10:00Z"), "DAY"), 3);
  check("73h daily = 4 days", billableUnits(d("2026-08-01T10:00Z"), d("2026-08-04T11:00Z"), "DAY"), 4);
  check("1h daily = 1 day", billableUnits(d("2026-08-01T10:00Z"), d("2026-08-01T11:00Z"), "DAY"), 1);
  check("8 days weekly = 2 weeks", billableUnits(d("2026-08-01T10:00Z"), d("2026-08-09T10:00Z"), "WEEK"), 2);

  console.log("\n--- late fees ---");
  check("returned early = no fee", lateFee({ dueAt: d("2026-08-05T10:00Z"), returnedAt: d("2026-08-05T09:00Z"), unit: "DAY", amountPerUnit: 500 }).amount, 0);
  check("1h late inside 2h grace = no fee", lateFee({ dueAt: d("2026-08-05T10:00Z"), returnedAt: d("2026-08-05T11:00Z"), unit: "DAY", amountPerUnit: 500, graceHours: 2 }).amount, 0);
  check("3 days late = 1500", lateFee({ dueAt: d("2026-08-05T10:00Z"), returnedAt: d("2026-08-08T10:00Z"), unit: "DAY", amountPerUnit: 500, graceHours: 2 }).amount, 1500);
  check("cap respected", lateFee({ dueAt: d("2026-08-05T10:00Z"), returnedAt: d("2026-11-05T10:00Z"), unit: "DAY", amountPerUnit: 500, maxAmount: 25000 }).amount, 25000);

  console.log("\n--- deposit settlement ---");
  check("penalty < deposit", settleDeposit(15000, 1500), { deducted: 1500, refunded: 13500, shortfall: 0 });
  check("on-time full refund", settleDeposit(15000, 0), { deducted: 0, refunded: 15000, shortfall: 0 });
  check("penalty > deposit", settleDeposit(1000, 2500), { deducted: 1000, refunded: 0, shortfall: 1500 });

  console.log("\n--- checkout against the database ---");
  const { addToCart, getCart } = await import("../src/server/services/cart");
  const { checkout } = await import("../src/server/services/orders");

  const customer = await prisma.user.findUniqueOrThrow({
    where: { email: "customer@rentflow.test" },
  });
  const product = await prisma.product.findUniqueOrThrow({
    where: { slug: "canon-eos-r5-kit" },
  });
  const daily = await prisma.rentalPeriod.findFirstOrThrow({
    where: { unit: "DAY" },
  });
  const address = await prisma.address.findFirstOrThrow({
    where: { userId: customer.id },
  });

  const stockBefore = await prisma.product.findUniqueOrThrow({
    where: { id: product.id },
    select: { reservedStock: true },
  });

  await prisma.cartItem.deleteMany({ where: { cart: { userId: customer.id } } });
  await addToCart(customer.id, {
    productId: product.id,
    rentalPeriodId: daily.id,
    quantity: 2,
    rentalStart: d("2026-09-01T10:00:00Z"),
    rentalEnd: d("2026-09-04T10:00:00Z"),
  });

  const cart = await getCart(customer.id);
  check("cart rent = 900 x 3 days x 2", cart.rentTotal, 5400);
  check("cart deposit = 15000 x 2", cart.depositTotal, 30000);
  check("cart payable", cart.grandTotal, 35400);

  const order = await checkout(customer.id, {
    fulfilment: "DELIVERY",
    shippingAddressId: address.id,
    paymentMethod: "Card •••• 4242",
  });

  const saved = await prisma.rentalOrder.findUniqueOrThrow({
    where: { id: order.id },
    include: {
      lines: true,
      payments: true,
      invoices: true,
      pickup: true,
      return: true,
      deposit: { include: { transactions: true } },
    },
  });

  check("order confirmed", saved.status, "CONFIRMED");
  check("order rent", Number(saved.subtotal), 5400);
  check("order deposit", Number(saved.depositTotal), 30000);
  check("order lines", saved.lines.length, 1);
  check("rent + deposit payments created", saved.payments.length, 2);
  check("invoice created", saved.invoices.length, 1);
  check("deposit held", saved.deposit?.status, "HELD");
  check("deposit ledger opened", saved.deposit?.transactions.length, 1);
  check("pickup scheduled", Boolean(saved.pickup), true);
  check("return scheduled", Boolean(saved.return), true);

  const emptied = await getCart(customer.id);
  check("cart emptied after checkout", emptied.items.length, 0);

  const stockAfter = await prisma.product.findUniqueOrThrow({
    where: { id: product.id },
    select: { reservedStock: true },
  });
  check("stock reserved", stockAfter.reservedStock - stockBefore.reservedStock, 2);

  // ---- overdue detection + return settlement ------------------------------
  console.log("\n--- overdue detection ---");
  const { markOverdueRentals, processReturn, confirmPickup } = await import(
    "../src/server/services/rentals"
  );

  const flagged = await markOverdueRentals();
  console.log(`  flagged ${flagged} order(s) as overdue`);

  const stillOut = await prisma.rentalOrder.count({
    where: { rentalEnd: { lt: new Date() }, returnedAt: null, status: { in: ["CONFIRMED", "ACTIVE", "PICKED_UP", "RETURN_DUE"] } },
  });
  check("no un-flagged overdue orders remain", stillOut, 0);

  console.log("\n--- late return settles the deposit ---");
  const overdueOrder = await prisma.rentalOrder.findFirstOrThrow({
    where: { status: "OVERDUE", returnedAt: null },
    include: { deposit: true, lines: true },
    orderBy: { rentalEnd: "asc" },
  });
  const depositBefore = Number(overdueOrder.deposit!.amount);
  const reservedBefore = await prisma.product.findUniqueOrThrow({
    where: { id: overdueOrder.lines[0].productId },
    select: { reservedStock: true },
  });

  await processReturn(overdueOrder.id, {
    inspections: [
      { productId: overdueOrder.lines[0].productId, condition: "GOOD" },
    ],
  });

  const settledOrder = await prisma.rentalOrder.findUniqueOrThrow({
    where: { id: overdueOrder.id },
    include: { deposit: { include: { transactions: true } }, lateFees: true, payments: true },
  });

  const deducted = Number(settledOrder.deposit!.deductedAmount);
  const refunded = Number(settledOrder.deposit!.refundedAmount);

  check("order completed", settledOrder.status, "COMPLETED");
  check("returnedAt recorded", settledOrder.returnedAt !== null, true);
  check("late fee raised", settledOrder.lateFees.length >= 1, true);
  check("penalty deducted from deposit", deducted > 0, true);
  check("deducted + refunded = deposit", Math.round(deducted + refunded), Math.round(depositBefore));
  check("deposit partially refunded", settledOrder.deposit!.status, "PARTIALLY_REFUNDED");
  check("cash refund payment created", settledOrder.payments.some((p) => p.purpose === "REFUND"), true);
  check("ledger has deduction + refund", settledOrder.deposit!.transactions.filter((t) => t.type !== "COLLECTION").length, 2);

  const reservedAfter = await prisma.product.findUniqueOrThrow({
    where: { id: overdueOrder.lines[0].productId },
    select: { reservedStock: true },
  });
  check(
    "stock released on return",
    reservedBefore.reservedStock - reservedAfter.reservedStock,
    overdueOrder.lines[0].quantity
  );

  console.log("\n--- on-time return refunds in full ---");
  const futureOrder = await prisma.rentalOrder.findFirstOrThrow({
    where: { returnedAt: null, rentalEnd: { gte: new Date() } },
    include: { deposit: true, lines: true },
  });
  const fullDeposit = Number(futureOrder.deposit!.amount);

  await confirmPickup(futureOrder.id);
  await processReturn(futureOrder.id, { returnedAt: new Date() });

  const onTime = await prisma.rentalOrder.findUniqueOrThrow({
    where: { id: futureOrder.id },
    include: { deposit: true, lateFees: true },
  });

  check("no late fee on time", onTime.lateFees.length, 0);
  check("nothing deducted", Number(onTime.deposit!.deductedAmount), 0);
  check("full deposit refunded", Number(onTime.deposit!.refundedAmount), fullDeposit);
  check("deposit status REFUNDED", onTime.deposit!.status, "REFUNDED");

  console.log(`\n${failed === 0 ? "ALL CHECKS PASSED" : `${failed} CHECK(S) FAILED`}`);
  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
