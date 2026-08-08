/**
 * Bulk seed: 300 products, 300 customers and 300 rental orders.
 *
 * Exists to exercise pagination and to make the dashboard look like a real
 * business rather than a demo. Run after the normal seed, which sets up the
 * pricelist, rental periods and org settings this builds on:
 *
 *   npm run db:seed && npm run db:seed:bulk
 *
 * Everything uses createMany with ids generated up front. The per-row upsert
 * approach the normal seed uses would be thousands of sequential round trips
 * here — minutes against a database in another region.
 */

import { PrismaClient, Prisma, type RentalUnit } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const COUNT = 300;
const BATCH = 500;

const NOW = new Date();
function daysFromNow(days: number, hour = 10) {
  const d = new Date(NOW);
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d;
}

/**
 * Deterministic pseudo-random so re-running produces the same catalogue.
 * `Math.random()` would make every run a different dataset, which makes
 * "is this bug reproducible?" much harder to answer.
 */
let seedState = 987654321;
function rand() {
  seedState = (seedState * 1664525 + 1013904223) % 4294967296;
  return seedState / 4294967296;
}
function pick<T>(items: readonly T[]): T {
  return items[Math.floor(rand() * items.length)];
}
function between(min: number, max: number) {
  return min + Math.floor(rand() * (max - min + 1));
}

const ADJECTIVES = ["Pro", "Compact", "Heavy-Duty", "Portable", "Industrial", "Studio", "Field", "Commercial", "Premium", "Compact"] as const;
const NOUNS = ["Camera", "Lens", "Tripod", "Generator", "Scaffold", "Mixer", "Speaker", "Projector", "Marquee", "Chair", "Table", "Drill", "Sander", "Washer", "Heater", "Cooler", "Lighting Rig", "Drone", "Gimbal", "Monitor"] as const;
const BRANDS = ["Canon", "Sony", "DJI", "Bosch", "Makita", "Honda", "RCF", "Epson", "Kubota", "Karcher"] as const;
const MANUFACTURERS = ["Canon Inc.", "Sony Corporation", "SZ DJI", "Robert Bosch GmbH", "Makita Corp", "Honda Motor", "RCF S.p.A.", "Seiko Epson", "Kubota Corp", "Alfred Karcher SE"] as const;
const COLOURS = ["Black", "Grey", "White", "Silver", "Orange", "Blue", "Yellow", "Green"] as const;
const SIZES = ["Small", "Medium", "Large", "XL", "Standard", "Compact"] as const;
const IMAGES = [
  "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&q=80",
  "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80",
  "https://images.unsplash.com/photo-1606986628253-05620e9b3b0f?w=800&q=80",
  "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&q=80",
  "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&q=80",
  "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800&q=80",
  "https://images.unsplash.com/photo-1508973379184-7517410fb0bc?w=800&q=80",
  "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800&q=80",
] as const;

const FIRST = ["Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Ayaan", "Krishna", "Ishaan", "Ananya", "Diya", "Aadhya", "Saanvi", "Myra", "Anika", "Navya", "Kiara", "Riya", "Meera"] as const;
const LAST = ["Sharma", "Verma", "Patel", "Gupta", "Singh", "Kumar", "Reddy", "Nair", "Iyer", "Das", "Mehta", "Joshi", "Kapoor", "Bose", "Chopra"] as const;
const CITIES = [
  ["Bengaluru", "Karnataka", "560001"],
  ["Mumbai", "Maharashtra", "400001"],
  ["Delhi", "Delhi", "110001"],
  ["Hyderabad", "Telangana", "500001"],
  ["Chennai", "Tamil Nadu", "600001"],
  ["Pune", "Maharashtra", "411001"],
  ["Kolkata", "West Bengal", "700001"],
] as const;

const money = (n: number) => new Prisma.Decimal(n.toFixed(2));

/** createMany in chunks: one enormous statement can exceed parameter limits. */
async function chunked<T>(
  rows: T[],
  run: (batch: T[]) => Promise<unknown>
): Promise<void> {
  for (let i = 0; i < rows.length; i += BATCH) {
    await run(rows.slice(i, i + BATCH));
  }
}

async function main() {
  console.log(`Bulk seeding ${COUNT} products, customers and orders...`);
  const started = Date.now();

  const [pricelist, periods, categories, lateFeeRule] = await Promise.all([
    prisma.pricelist.findFirst({ where: { isDefault: true } }),
    prisma.rentalPeriod.findMany({ where: { isActive: true } }),
    prisma.category.findMany(),
    prisma.lateFeeRule.findFirst({ where: { isActive: true } }),
  ]);

  if (!pricelist || periods.length === 0 || categories.length === 0) {
    throw new Error("Run `npm run db:seed` first — this builds on its config.");
  }

  const dailyPeriod =
    periods.find((p) => p.unit === "DAY") ?? periods[0];

  // ---- clear anything a previous bulk run left behind --------------------
  console.log("  clearing previous bulk rows...");
  await prisma.depositTransaction.deleteMany({ where: { deposit: { order: { number: { startsWith: "RO-BULK-" } } } } });
  await prisma.securityDeposit.deleteMany({ where: { order: { number: { startsWith: "RO-BULK-" } } } });
  await prisma.payment.deleteMany({ where: { order: { number: { startsWith: "RO-BULK-" } } } });
  await prisma.invoice.deleteMany({ where: { order: { number: { startsWith: "RO-BULK-" } } } });
  await prisma.pickup.deleteMany({ where: { order: { number: { startsWith: "RO-BULK-" } } } });
  await prisma.return.deleteMany({ where: { order: { number: { startsWith: "RO-BULK-" } } } });
  await prisma.lateFee.deleteMany({ where: { order: { number: { startsWith: "RO-BULK-" } } } });
  await prisma.rentalOrderLine.deleteMany({ where: { order: { number: { startsWith: "RO-BULK-" } } } });
  await prisma.rentalOrder.deleteMany({ where: { number: { startsWith: "RO-BULK-" } } });
  await prisma.pricelistItem.deleteMany({ where: { product: { sku: { startsWith: "BULK-" } } } });
  await prisma.productVariant.deleteMany({ where: { sku: { startsWith: "BULK-" } } });
  await prisma.product.deleteMany({ where: { sku: { startsWith: "BULK-" } } });
  await prisma.address.deleteMany({ where: { user: { email: { startsWith: "bulk." } } } });
  await prisma.cartItem.deleteMany({ where: { cart: { user: { email: { startsWith: "bulk." } } } } });
  await prisma.cart.deleteMany({ where: { user: { email: { startsWith: "bulk." } } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: "bulk." } } });

  // ---- products ----------------------------------------------------------
  console.log("  products...");
  const productIds: string[] = [];
  const productDeposit: number[] = [];
  const products: Prisma.ProductCreateManyInput[] = [];
  const variants: Prisma.ProductVariantCreateManyInput[] = [];
  const rates: Prisma.PricelistItemCreateManyInput[] = [];

  for (let i = 0; i < COUNT; i++) {
    const id = `bulk-prod-${String(i).padStart(4, "0")}`;
    const name = `${pick(ADJECTIVES)} ${pick(NOUNS)} ${between(100, 999)}`;
    const dayRate = between(2, 60) * 50;
    const deposit = dayRate * between(5, 20);

    productIds.push(id);
    productDeposit.push(deposit);

    products.push({
      id,
      name,
      slug: `bulk-${i}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      sku: `BULK-${String(i).padStart(4, "0")}`,
      description: `${name} available for hourly, daily, weekly or monthly hire.`,
      imageUrl: pick(IMAGES),
      categoryId: pick(categories).id,
      totalStock: between(2, 40),
      depositType: rand() > 0.85 ? "PERCENTAGE" : "FIXED",
      depositValue: money(rand() > 0.85 ? between(10, 40) : deposit),
    });

    variants.push({
      id: `bulk-var-${String(i).padStart(4, "0")}`,
      productId: id,
      sku: `BULK-${String(i).padStart(4, "0")}-V1`,
      brand: pick(BRANDS),
      manufacturer: pick(MANUFACTURERS),
      color: pick(COLOURS),
      size: pick(SIZES),
      stock: between(1, 20),
    });

    // Rates scale off the daily figure so hourly < daily < weekly < monthly.
    for (const period of periods) {
      const multiplier =
        period.unit === "HOUR" ? 0.3 : period.unit === "WEEK" ? 5.5 : period.unit === "MONTH" ? 18 : 1;
      rates.push({
        pricelistId: pricelist.id,
        productId: id,
        rentalPeriodId: period.id,
        price: money(Math.round((dayRate * multiplier) / 10) * 10),
      });
    }
  }

  await chunked(products, (batch) => prisma.product.createMany({ data: batch }));
  await chunked(variants, (batch) => prisma.productVariant.createMany({ data: batch }));
  await chunked(rates, (batch) => prisma.pricelistItem.createMany({ data: batch }));

  // ---- customers ---------------------------------------------------------
  console.log("  customers...");
  // One hash reused across generated accounts: bcrypt at 12 rounds x 300 is
  // ~90s of pure CPU, and these are throwaway load-test logins.
  const sharedHash = await bcrypt.hash("Customer@123", 12);

  const users: Prisma.UserCreateManyInput[] = [];
  const carts: Prisma.CartCreateManyInput[] = [];
  const addresses: Prisma.AddressCreateManyInput[] = [];
  const customerIds: string[] = [];

  for (let i = 0; i < COUNT; i++) {
    const id = `bulk-user-${String(i).padStart(4, "0")}`;
    const name = `${pick(FIRST)} ${pick(LAST)}`;
    const [city, state, postal] = pick(CITIES);

    customerIds.push(id);
    users.push({
      id,
      name,
      email: `bulk.${i}@rentflow.test`,
      phone: `+91 9${between(100000000, 999999999)}`,
      passwordHash: sharedHash,
      role: "CUSTOMER",
      createdAt: daysFromNow(-between(1, 400)),
    });
    carts.push({ id: `bulk-cart-${String(i).padStart(4, "0")}`, userId: id });
    addresses.push({
      id: `bulk-addr-${String(i).padStart(4, "0")}`,
      userId: id,
      label: "Home",
      line1: `${between(1, 200)} ${pick(LAST)} Road`,
      city,
      state,
      postalCode: postal,
      isDefault: true,
    });
  }

  await chunked(users, (batch) => prisma.user.createMany({ data: batch }));
  await chunked(carts, (batch) => prisma.cart.createMany({ data: batch }));
  await chunked(addresses, (batch) => prisma.address.createMany({ data: batch }));

  // ---- orders ------------------------------------------------------------
  console.log("  orders...");
  const orders: Prisma.RentalOrderCreateManyInput[] = [];
  const lines: Prisma.RentalOrderLineCreateManyInput[] = [];
  const deposits: Prisma.SecurityDepositCreateManyInput[] = [];
  const txns: Prisma.DepositTransactionCreateManyInput[] = [];
  const payments: Prisma.PaymentCreateManyInput[] = [];
  const invoices: Prisma.InvoiceCreateManyInput[] = [];
  const pickups: Prisma.PickupCreateManyInput[] = [];
  const returns: Prisma.ReturnCreateManyInput[] = [];
  const lateFees: Prisma.LateFeeCreateManyInput[] = [];

  const LATE_RATE = Number(lateFeeRule?.amountPerUnit ?? 500);
  const GRACE = lateFeeRule?.graceHours ?? 2;

  for (let i = 0; i < COUNT; i++) {
    const id = `bulk-order-${String(i).padStart(4, "0")}`;
    const number = `RO-BULK-${String(i).padStart(4, "0")}`;
    const productIndex = between(0, COUNT - 1);
    const productId = productIds[productIndex];
    const quantity = between(1, 4);

    // Spread across the past year and the next fortnight so the dashboard,
    // the overdue queue and the reports all have something to show.
    const startDay = between(-330, 12);
    const days = between(1, 14);
    const rentalStart = daysFromNow(startDay);
    const rentalEnd = daysFromNow(startDay + days);

    const unitPrice = between(2, 60) * 50;
    const rent = unitPrice * days * quantity;
    const deposit = productDeposit[productIndex] * quantity;

    const isPast = startDay + days < 0;
    // Most past rentals came back; a slice stayed out and is overdue.
    const returned = isPast && rand() > 0.18;
    const lateDays = returned && rand() > 0.75 ? between(1, 6) : 0;
    const returnedAt = returned
      ? new Date(rentalEnd.getTime() + lateDays * 86_400_000)
      : null;

    const penalty = lateDays > 0 ? Math.min(25000, Math.ceil((lateDays * 24 - GRACE) / 24) * LATE_RATE) : 0;
    const deducted = returned ? Math.min(deposit, penalty) : 0;
    const refunded = returned ? deposit - deducted : 0;

    const status = returned
      ? "COMPLETED"
      : isPast
        ? "OVERDUE"
        : startDay <= 0
          ? "ACTIVE"
          : "CONFIRMED";

    orders.push({
      id,
      number,
      customerId: customerIds[between(0, COUNT - 1)],
      status,
      fulfilment: rand() > 0.4 ? "DELIVERY" : "STORE_PICKUP",
      rentalStart,
      rentalEnd,
      returnedAt,
      subtotal: money(rent),
      depositTotal: money(deposit),
      lateFeeTotal: money(deducted),
      total: money(rent + deposit),
      createdAt: rentalStart,
    });

    lines.push({
      id: `bulk-line-${String(i).padStart(4, "0")}`,
      orderId: id,
      productId,
      rentalPeriodId: dailyPeriod.id,
      quantity,
      unitPrice: money(unitPrice),
      depositAmount: money(deposit),
      lineTotal: money(rent),
    });

    const depositId = `bulk-dep-${String(i).padStart(4, "0")}`;
    deposits.push({
      id: depositId,
      orderId: id,
      type: "FIXED",
      value: money(deposit),
      amount: money(deposit),
      status: !returned ? "HELD" : deducted > 0 ? "PARTIALLY_REFUNDED" : "REFUNDED",
      deductedAmount: money(deducted),
      refundedAmount: money(refunded),
      collectedAt: rentalStart,
      settledAt: returnedAt,
    });

    txns.push({
      id: `bulk-txn-c-${String(i).padStart(4, "0")}`,
      depositId,
      type: "COLLECTION",
      amount: money(deposit),
      note: "Collected at order confirmation",
      createdAt: rentalStart,
    });
    if (deducted > 0 && returnedAt) {
      txns.push({
        id: `bulk-txn-d-${String(i).padStart(4, "0")}`,
        depositId,
        type: "DEDUCTION",
        amount: money(deducted),
        note: "Late return penalty",
        createdAt: returnedAt,
      });
    }
    if (refunded > 0 && returnedAt) {
      txns.push({
        id: `bulk-txn-r-${String(i).padStart(4, "0")}`,
        depositId,
        type: "REFUND",
        amount: money(refunded),
        note: deducted > 0 ? "Balance refunded in cash" : "Returned on time, full refund",
        createdAt: returnedAt,
      });
    }

    payments.push(
      {
        id: `bulk-pay-r-${String(i).padStart(4, "0")}`,
        orderId: id,
        purpose: "RENTAL",
        status: "PAID",
        amount: money(rent),
        method: "Card •••• 4242",
        paidAt: rentalStart,
      },
      {
        id: `bulk-pay-d-${String(i).padStart(4, "0")}`,
        orderId: id,
        purpose: "DEPOSIT",
        status: "PAID",
        amount: money(deposit),
        method: "Card •••• 4242",
        paidAt: rentalStart,
      }
    );

    invoices.push({
      id: `bulk-inv-${String(i).padStart(4, "0")}`,
      number: `INV-BULK-${String(i).padStart(4, "0")}`,
      orderId: id,
      kind: "RENTAL",
      amount: money(rent + deposit),
      issuedAt: rentalStart,
    });

    pickups.push({
      id: `bulk-pick-${String(i).padStart(4, "0")}`,
      orderId: id,
      scheduledFor: rentalStart,
      status: startDay <= 0 ? "COMPLETED" : "SCHEDULED",
      routeSequence: (i % 8) + 1,
      assignedTo: `Team ${String.fromCharCode(65 + (i % 4))}`,
      confirmedAt: startDay <= 0 ? rentalStart : null,
    });

    returns.push({
      id: `bulk-ret-${String(i).padStart(4, "0")}`,
      orderId: id,
      scheduledFor: rentalEnd,
      receivedAt: returnedAt,
      status: returned ? "COMPLETED" : "SCHEDULED",
      isLate: penalty > 0,
    });

    if (penalty > 0 && returnedAt) {
      lateFees.push({
        id: `bulk-fee-${String(i).padStart(4, "0")}`,
        orderId: id,
        ruleId: lateFeeRule?.id,
        overdueUnits: lateDays,
        amount: money(deducted),
        status: "DEDUCTED_FROM_DEPOSIT",
        calculatedAt: returnedAt,
      });
    }
  }

  await chunked(orders, (batch) => prisma.rentalOrder.createMany({ data: batch }));
  await chunked(lines, (batch) => prisma.rentalOrderLine.createMany({ data: batch }));
  await chunked(deposits, (batch) => prisma.securityDeposit.createMany({ data: batch }));
  await chunked(txns, (batch) => prisma.depositTransaction.createMany({ data: batch }));
  await chunked(payments, (batch) => prisma.payment.createMany({ data: batch }));
  await chunked(invoices, (batch) => prisma.invoice.createMany({ data: batch }));
  await chunked(pickups, (batch) => prisma.pickup.createMany({ data: batch }));
  await chunked(returns, (batch) => prisma.return.createMany({ data: batch }));
  await chunked(lateFees, (batch) => prisma.lateFee.createMany({ data: batch }));

  // Reserved stock must reflect what is genuinely still out.
  console.log("  reconciling reserved stock...");
  await prisma.product.updateMany({
    where: { sku: { startsWith: "BULK-" } },
    data: { reservedStock: 0 },
  });

  const totals = {
    products: await prisma.product.count(),
    customers: await prisma.user.count({ where: { role: "CUSTOMER" } }),
    orders: await prisma.rentalOrder.count(),
    deposits: await prisma.securityDeposit.count(),
    payments: await prisma.payment.count(),
    lateFees: await prisma.lateFee.count(),
  };

  console.log(
    `\nDone in ${((Date.now() - started) / 1000).toFixed(1)}s\n` +
      Object.entries(totals)
        .map(([k, v]) => `  ${k.padEnd(10)} ${v}`)
        .join("\n")
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
