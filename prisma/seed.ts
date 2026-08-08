import {
  Prisma,
  PrismaClient,
  type OrderStatus,
  type RentalUnit,
} from "@prisma/client";
import bcrypt from "bcryptjs";

import { CATEGORIES, CUSTOMERS, PRODUCTS } from "./catalog-data";

const prisma = new PrismaClient();

const PERIODS: { name: string; unit: RentalUnit; duration: number }[] = [
  { name: "Hourly", unit: "HOUR", duration: 1 },
  { name: "Daily", unit: "DAY", duration: 1 },
  { name: "Weekly", unit: "WEEK", duration: 1 },
  { name: "Monthly", unit: "MONTH", duration: 1 },
];

/** Dates are relative to run time so the dashboard always has "today" rows. */
const NOW = new Date();
function daysFromNow(days: number, hour = 10) {
  const d = new Date(NOW);
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d;
}

/**
 * Demo rental orders covering every state the dashboard reports on: live
 * rentals, ones due today, overdue ones, and settled history (both an on-time
 * full refund and a late return with a penalty deducted).
 */
const DEMO_ORDERS: {
  customer: string;
  productSlug: string;
  quantity: number;
  unit: RentalUnit;
  startDay: number;
  endDay: number;
  status: OrderStatus;
  fulfilment: "DELIVERY" | "STORE_PICKUP";
  /** Days after rentalEnd the goods actually came back. Null = still out. */
  returnedAfterDays: number | null;
}[] = [
  { customer: "customer@rentflow.test", productSlug: "canon-eos-r5-kit", quantity: 1, unit: "DAY", startDay: -4, endDay: 3, status: "ACTIVE", fulfilment: "DELIVERY", returnedAfterDays: null },
  { customer: "ravi.sharma@example.com", productSlug: "scaffolding-tower-6m", quantity: 2, unit: "WEEK", startDay: -20, endDay: -6, status: "OVERDUE", fulfilment: "STORE_PICKUP", returnedAfterDays: null },
  { customer: "anita.desai@example.com", productSlug: "banquet-table-10", quantity: 12, unit: "DAY", startDay: -30, endDay: -26, status: "COMPLETED", fulfilment: "DELIVERY", returnedAfterDays: 0 },
  { customer: "karan.mehta@example.com", productSlug: "line-array-pa-2kw", quantity: 1, unit: "DAY", startDay: -12, endDay: -9, status: "COMPLETED", fulfilment: "DELIVERY", returnedAfterDays: 3 },
  { customer: "meera.iyer@example.com", productSlug: "mini-excavator-15t", quantity: 1, unit: "WEEK", startDay: -3, endDay: 0, status: "ACTIVE", fulfilment: "DELIVERY", returnedAfterDays: null },
  { customer: "farhan.qureshi@example.com", productSlug: "laser-projector-4k", quantity: 2, unit: "DAY", startDay: 0, endDay: 2, status: "READY_FOR_PICKUP", fulfilment: "STORE_PICKUP", returnedAfterDays: null },
  { customer: "customer@rentflow.test", productSlug: "dji-mavic-3-pro", quantity: 1, unit: "DAY", startDay: 1, endDay: 5, status: "CONFIRMED", fulfilment: "DELIVERY", returnedAfterDays: null },
  { customer: "ravi.sharma@example.com", productSlug: "chiavari-chair", quantity: 80, unit: "DAY", startDay: -1, endDay: 0, status: "ACTIVE", fulfilment: "DELIVERY", returnedAfterDays: null },
  { customer: "anita.desai@example.com", productSlug: "rotary-hammer-drill", quantity: 2, unit: "WEEK", startDay: -9, endDay: -2, status: "OVERDUE", fulfilment: "STORE_PICKUP", returnedAfterDays: null },
  { customer: "karan.mehta@example.com", productSlug: "electric-hospital-bed", quantity: 1, unit: "MONTH", startDay: -45, endDay: -15, status: "COMPLETED", fulfilment: "DELIVERY", returnedAfterDays: 0 },
];

const LATE_FEE_PER_DAY = 500;
const GRACE_HOURS = 2;

function money(n: number) {
  return new Prisma.Decimal(n.toFixed(2));
}

async function main() {
  console.log("Seeding...");

  // ---- wipe transactional data so re-seeding is idempotent ---------------
  await prisma.depositTransaction.deleteMany();
  await prisma.securityDeposit.deleteMany();
  await prisma.returnInspection.deleteMany();
  await prisma.return.deleteMany();
  await prisma.pickup.deleteMany();
  await prisma.lateFee.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.rentalOrderLine.deleteMany();
  await prisma.rentalOrder.deleteMany();
  await prisma.cartItem.deleteMany();

  // ---- users -------------------------------------------------------------
  const admin = await prisma.user.upsert({
    where: { email: "admin@rentflow.test" },
    update: {},
    create: {
      name: "Rental Admin",
      email: "admin@rentflow.test",
      phone: "+91 98200 00000",
      passwordHash: await bcrypt.hash("Admin@123", 12),
      role: "ADMIN",
    },
  });

  // Parallel on purpose: against a remote database each round trip costs
  // ~250ms, and doing this serially made the seed take minutes.
  const customers = new Map<string, string>();
  const customerRows = await Promise.all(
    CUSTOMERS.map(async (c, index) => {
      const user = await prisma.user.upsert({
        where: { email: c.email },
        update: { name: c.name, phone: c.phone },
        create: {
          name: c.name,
          email: c.email,
          phone: c.phone,
          passwordHash: await bcrypt.hash(c.password, 12),
          role: "CUSTOMER",
          cart: { create: {} },
        },
      });

      await prisma.address.upsert({
        where: { id: `addr-${user.id}` },
        update: {},
        create: {
          id: `addr-${user.id}`,
          userId: user.id,
          label: "Home",
          line1: `${11 + index} Residency Road`,
          city: "Bengaluru",
          state: "Karnataka",
          postalCode: "560025",
          isDefault: true,
        },
      });

      return [c.email, user.id] as const;
    })
  );
  for (const [email, id] of customerRows) customers.set(email, id);

  // ---- org config --------------------------------------------------------
  await prisma.orgSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      companyName: "RentFlow Rentals",
      currency: "INR",
      defaultDepositType: "FIXED",
      defaultDepositValue: 1000,
      defaultGraceHours: GRACE_HOURS,
      quotationValidDays: 7,
    },
  });

  const lateFeeRule = await prisma.lateFeeRule.upsert({
    where: { id: "default-late-fee" },
    update: {},
    create: {
      id: "default-late-fee",
      name: "Standard daily late fee",
      unit: "DAY",
      amountPerUnit: LATE_FEE_PER_DAY,
      graceHours: GRACE_HOURS,
      maxAmount: 25000,
    },
  });

  // ---- rental periods and categories (independent, so run together) ------
  const [periodRows, categoryRows] = await Promise.all([
    Promise.all(
      PERIODS.map((period) =>
        prisma.rentalPeriod.upsert({
          where: {
            unit_duration: { unit: period.unit, duration: period.duration },
          },
          update: {},
          create: period,
        })
      )
    ),
    Promise.all(
      CATEGORIES.map((category) =>
        prisma.category.upsert({
          where: { slug: category.slug },
          update: {},
          create: category,
        })
      )
    ),
  ]);

  const periods = new Map<RentalUnit, { id: string; duration: number }>(
    periodRows.map((r) => [r.unit, { id: r.id, duration: r.duration }])
  );
  const categories = new Map<string, string>(
    categoryRows.map((r) => [r.slug, r.id])
  );

  // ---- pricelists --------------------------------------------------------
  // `update` repeats the flags on purpose: reseeding should repair the
  // pricelist state, not preserve whatever was clicked in the admin UI.
  await prisma.pricelist.updateMany({
    where: { isDefault: true },
    data: { isDefault: false },
  });

  const pricelist = await prisma.pricelist.upsert({
    where: { id: "default-pricelist" },
    update: { isDefault: true, isActive: true },
    create: { id: "default-pricelist", name: "Standard Pricelist", isDefault: true },
  });

  // A second, time-bound list proves the "some pricelists are for a specific
  // period" requirement. Inactive so it doesn't override the default today.
  await prisma.pricelist.upsert({
    where: { id: "festive-pricelist" },
    update: { isDefault: false, isActive: false },
    create: {
      id: "festive-pricelist",
      name: "Festive Season 2026",
      isDefault: false,
      isActive: false,
      validFrom: new Date(NOW.getFullYear(), 9, 1),
      validTo: new Date(NOW.getFullYear(), 10, 15),
    },
  });

  // ---- catalogue ---------------------------------------------------------
  const productIds = new Map<string, string>();
  const productPrice = new Map<string, Map<RentalUnit, number>>();

  // Each product's own writes stay ordered, but products run concurrently:
  // 24 products x 6 statements serially is ~150 round trips.
  await Promise.all(
    PRODUCTS.map(async (item) => {
      const product = await prisma.product.upsert({
        where: { slug: item.slug },
        update: { totalStock: item.totalStock, reservedStock: 0 },
        create: {
          name: item.name,
          slug: item.slug,
          sku: item.sku,
          description: item.description,
          imageUrl: item.imageUrl,
          categoryId: categories.get(item.category),
          totalStock: item.totalStock,
          depositType: item.depositType ?? "FIXED",
          depositValue: item.depositValue,
        },
      });

      productIds.set(item.slug, product.id);
      productPrice.set(
        item.slug,
        new Map(Object.entries(item.prices) as [RentalUnit, number][])
      );

      await Promise.all([
        ...item.variants.map((variant) =>
          prisma.productVariant.upsert({
            where: { sku: variant.sku },
            update: {},
            create: { ...variant, productId: product.id },
          })
        ),
        ...Object.entries(item.prices).map(([unit, price]) => {
          const period = periods.get(unit as RentalUnit)!;
          return prisma.pricelistItem.upsert({
            where: {
              pricelistId_productId_rentalPeriodId: {
                pricelistId: pricelist.id,
                productId: product.id,
                rentalPeriodId: period.id,
              },
            },
            update: { price },
            create: {
              pricelistId: pricelist.id,
              productId: product.id,
              rentalPeriodId: period.id,
              price,
            },
          });
        }),
      ]);
    })
  );

  // ---- demo rental orders ------------------------------------------------
  const HOURS_PER_UNIT: Record<RentalUnit, number> = {
    HOUR: 1,
    DAY: 24,
    WEEK: 168,
    MONTH: 720,
  };

  let orderSeq = 0;
  let invoiceSeq = 0;

  for (const spec of DEMO_ORDERS) {
    const customerId = customers.get(spec.customer)!;
    const productId = productIds.get(spec.productSlug)!;
    const seedProduct = PRODUCTS.find((p) => p.slug === spec.productSlug)!;
    const period = periods.get(spec.unit)!;
    const unitPrice = productPrice.get(spec.productSlug)!.get(spec.unit)!;

    const rentalStart = daysFromNow(spec.startDay);
    const rentalEnd = daysFromNow(spec.endDay);

    const hours = (rentalEnd.getTime() - rentalStart.getTime()) / 3_600_000;
    const units = Math.max(1, Math.ceil(hours / HOURS_PER_UNIT[spec.unit] - 1e-9));

    const rent = unitPrice * units * spec.quantity;
    const deposit =
      seedProduct.depositType === "PERCENTAGE"
        ? (rent * seedProduct.depositValue) / 100
        : seedProduct.depositValue * spec.quantity;

    const returnedAt =
      spec.returnedAfterDays === null
        ? null
        : new Date(rentalEnd.getTime() + spec.returnedAfterDays * 86_400_000);

    // Late fee follows the same rule the app uses at settlement time.
    let penalty = 0;
    if (returnedAt) {
      const overdueHours =
        (returnedAt.getTime() - rentalEnd.getTime()) / 3_600_000 - GRACE_HOURS;
      if (overdueHours > 0) {
        penalty = Math.min(
          25000,
          Math.ceil(overdueHours / 24) * LATE_FEE_PER_DAY
        );
      }
    }

    const settled = returnedAt !== null;
    const deducted = settled ? Math.min(deposit, penalty) : 0;
    const refunded = settled ? deposit - deducted : 0;

    const address = await prisma.address.findFirst({ where: { userId: customerId } });

    orderSeq += 1;
    invoiceSeq += 1;

    const order = await prisma.rentalOrder.create({
      data: {
        number: `RO-${NOW.getFullYear()}-${String(orderSeq).padStart(4, "0")}`,
        customerId,
        status: spec.status,
        fulfilment: spec.fulfilment,
        shippingAddressId: spec.fulfilment === "DELIVERY" ? address?.id : null,
        rentalStart,
        rentalEnd,
        returnedAt,
        subtotal: money(rent),
        depositTotal: money(deposit),
        lateFeeTotal: money(deducted),
        total: money(rent + deposit),
        lines: {
          create: {
            productId,
            rentalPeriodId: period.id,
            quantity: spec.quantity,
            unitPrice: money(unitPrice),
            depositAmount: money(deposit),
            lineTotal: money(rent),
          },
        },
      },
    });

    // Deposit + its ledger, mirroring what checkout and settlement produce.
    const ledger: Prisma.DepositTransactionCreateWithoutDepositInput[] = [
      { type: "COLLECTION", amount: money(deposit), note: "Collected at order confirmation", createdAt: rentalStart },
    ];
    if (settled && deducted > 0) {
      ledger.push({ type: "DEDUCTION", amount: money(deducted), note: "Late return penalty", createdAt: returnedAt! });
    }
    if (settled && refunded > 0) {
      ledger.push({ type: "REFUND", amount: money(refunded), note: deducted > 0 ? "Balance refunded in cash" : "Returned on time, full refund", createdAt: returnedAt! });
    }

    await prisma.securityDeposit.create({
      data: {
        orderId: order.id,
        type: seedProduct.depositType ?? "FIXED",
        value: money(seedProduct.depositValue),
        amount: money(deposit),
        status: !settled
          ? "HELD"
          : deducted > 0
            ? "PARTIALLY_REFUNDED"
            : "REFUNDED",
        deductedAmount: money(deducted),
        refundedAmount: money(refunded),
        collectedAt: rentalStart,
        settledAt: returnedAt,
        transactions: { create: ledger },
      },
    });

    await prisma.payment.createMany({
      data: [
        { orderId: order.id, purpose: "RENTAL", status: "PAID", amount: money(rent), method: "Card •••• 4242", paidAt: rentalStart },
        { orderId: order.id, purpose: "DEPOSIT", status: "PAID", amount: money(deposit), method: "Card •••• 4242", paidAt: rentalStart },
      ],
    });

    await prisma.invoice.create({
      data: {
        number: `INV-${NOW.getFullYear()}-${String(invoiceSeq).padStart(4, "0")}`,
        orderId: order.id,
        kind: "RENTAL",
        amount: money(rent + deposit),
        issuedAt: rentalStart,
      },
    });

    if (penalty > 0) {
      await prisma.lateFee.create({
        data: {
          orderId: order.id,
          ruleId: lateFeeRule.id,
          overdueUnits: Math.ceil(
            ((returnedAt!.getTime() - rentalEnd.getTime()) / 3_600_000 - GRACE_HOURS) / 24
          ),
          amount: money(deducted),
          status: "DEDUCTED_FROM_DEPOSIT",
          calculatedAt: returnedAt!,
        },
      });
    }

    await prisma.pickup.create({
      data: {
        orderId: order.id,
        scheduledFor: rentalStart,
        status: spec.startDay <= 0 ? "COMPLETED" : "SCHEDULED",
        routeSequence: (orderSeq % 5) + 1,
        assignedTo: orderSeq % 2 === 0 ? "Team A" : "Team B",
        confirmedAt: spec.startDay <= 0 ? rentalStart : null,
      },
    });

    await prisma.return.create({
      data: {
        orderId: order.id,
        scheduledFor: rentalEnd,
        receivedAt: returnedAt,
        status: settled ? "COMPLETED" : "SCHEDULED",
        isLate: penalty > 0,
      },
    });

    // Anything still out is holding stock.
    if (!settled) {
      await prisma.product.update({
        where: { id: productId },
        data: { reservedStock: { increment: spec.quantity } },
      });
    }
  }

  const counts = {
    categories: await prisma.category.count(),
    products: await prisma.product.count(),
    customers: await prisma.user.count({ where: { role: "CUSTOMER" } }),
    orders: await prisma.rentalOrder.count(),
    deposits: await prisma.securityDeposit.count(),
    lateFees: await prisma.lateFee.count(),
  };

  console.log(
    `Seeded ${counts.products} products in ${counts.categories} categories, ` +
      `${counts.customers} customers, ${counts.orders} rental orders, ` +
      `${counts.deposits} deposits, ${counts.lateFees} late fees.\n` +
      `  admin:    ${admin.email} / Admin@123\n` +
      `  customer: customer@rentflow.test / Customer@123`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
