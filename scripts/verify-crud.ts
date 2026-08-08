/**
 * Exercises the admin create/edit/delete paths through the same server-action
 * code the UI calls. Run with `npm run verify:crud`.
 */

import Module from "module";
import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";

const prisma = new PrismaClient();

/**
 * Server actions run inside a Next request. Outside one, `next/cache`,
 * `next/navigation` and `next/headers` have no context, so we stub them.
 *
 * The cookie stub carries a genuinely signed admin session, which means
 * `requireRole("ADMIN")` still runs for real — the auth guard is tested, not
 * bypassed.
 */
async function installNextStubs() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set (32+ chars) to run this script.");
  }

  const admin = await prisma.user.findUniqueOrThrow({
    where: { email: "admin@rentflow.test" },
  });

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
    get: (name: string) =>
      name === "rms_session" ? { name, value: token } : undefined,
    set: () => {},
    delete: () => {},
  };

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const loader = Module as unknown as {
    _load: (request: string, parent: unknown, isMain: boolean) => any;
  };
  const originalLoad = loader._load;

  loader._load = function (request: string, parent: unknown, isMain: boolean) {
    if (request === "next/cache") {
      return { revalidatePath: () => {}, revalidateTag: () => {} };
    }
    if (request === "next/navigation") {
      return {
        redirect: (url: string) => {
          const error = new Error("NEXT_REDIRECT") as Error & { digest: string };
          error.digest = `NEXT_REDIRECT;${url}`;
          throw error;
        },
        notFound: () => {
          throw new Error("NEXT_NOT_FOUND");
        },
      };
    }
    if (request === "next/headers") {
      return { cookies: async () => cookieStore, headers: async () => new Map() };
    }
    return originalLoad.call(this, request, parent, isMain);
  };
}

let failed = 0;
function check(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${name}  got=${JSON.stringify(got)} want=${JSON.stringify(want)}`
  );
}

function fd(values: Record<string, string | number | boolean>) {
  const form = new FormData();
  for (const [k, v] of Object.entries(values)) form.append(k, String(v));
  return form;
}

async function main() {
  await installNextStubs();

  const {
    createProductAction,
    updateProductAction,
    deleteProductAction,
    createVariantAction,
    deleteVariantAction,
  } = await import("../src/app/(admin)/admin/products/actions");

  const {
    createPricelistAction,
    savePriceGridAction,
    deletePricelistAction,
    createRentalPeriodAction,
    deleteRentalPeriodAction,
    saveSettingsAction,
    saveLateFeeRuleAction,
  } = await import("../src/app/(admin)/admin/config-actions");

  const { createQuotationAction, confirmQuotationAction } = await import(
    "../src/app/(admin)/admin/quotations/actions"
  );

  const periods = await prisma.rentalPeriod.findMany({ where: { isActive: true } });
  const daily = periods.find((p) => p.unit === "DAY")!;

  // ---------------------------------------------------------------- product
  console.log("--- product CRUD ---");
  await prisma.product.deleteMany({ where: { sku: "TEST-CRUD-001" } });

  try {
    await createProductAction({}, fd({
      name: "CRUD Test Tripod",
      sku: "TEST-CRUD-001",
      description: "Created by the CRUD verification script.",
      imageUrl: "",
      categoryId: "",
      totalStock: 7,
      depositType: "FIXED",
      depositValue: 2500,
      isRentable: "true",
      [`price_${daily.id}`]: 400,
    }));
  } catch {
    // createProductAction redirects on success, which throws NEXT_REDIRECT.
  }

  const created = await prisma.product.findUnique({
    where: { sku: "TEST-CRUD-001" },
    include: { pricelistItems: true },
  });
  check("product created", created !== null, true);
  check("slug generated", created?.slug, "crud-test-tripod");
  check("stock saved", created?.totalStock, 7);
  check("deposit saved", Number(created?.depositValue ?? 0), 2500);
  check("rate created on default pricelist", created?.pricelistItems.length, 1);
  check("rate value", Number(created?.pricelistItems[0]?.price ?? 0), 400);

  const dupe = await createProductAction({}, fd({
    name: "Another Name",
    sku: "TEST-CRUD-001",
    totalStock: 1,
    depositType: "FIXED",
    depositValue: 0,
    [`price_${daily.id}`]: 100,
  }));
  check("duplicate SKU rejected", Boolean(dupe.error), true);

  await updateProductAction({}, fd({
    id: created!.id,
    name: "CRUD Test Tripod Pro",
    sku: "TEST-CRUD-001",
    totalStock: 12,
    depositType: "PERCENTAGE",
    depositValue: 25,
    isRentable: "true",
    [`price_${daily.id}`]: 550,
  }));

  const updated = await prisma.product.findUnique({
    where: { id: created!.id },
    include: { pricelistItems: true },
  });
  check("name updated", updated?.name, "CRUD Test Tripod Pro");
  check("stock updated", updated?.totalStock, 12);
  check("deposit type switched", updated?.depositType, "PERCENTAGE");
  check("rate updated", Number(updated!.pricelistItems[0].price), 550);

  // ---------------------------------------------------------------- variant
  console.log("\n--- variant CRUD ---");
  await createVariantAction({}, fd({
    productId: created!.id,
    sku: "TEST-CRUD-001-CF",
    brand: "Manfrotto",
    manufacturer: "Vitec Group",
    color: "Carbon",
    size: "160cm",
    stock: 7,
  }));

  const withVariant = await prisma.product.findUnique({
    where: { id: created!.id },
    include: { variants: true },
  });
  check("variant added", withVariant?.variants.length, 1);
  check("variant brand", withVariant?.variants[0].brand, "Manfrotto");

  await deleteVariantAction(fd({ id: withVariant!.variants[0].id, productId: created!.id }));
  check(
    "variant deleted",
    await prisma.productVariant.count({ where: { productId: created!.id } }),
    0
  );

  // -------------------------------------------------------------- pricelist
  console.log("\n--- pricelist CRUD ---");
  await prisma.pricelist.deleteMany({ where: { name: "CRUD Test Pricelist" } });

  await createPricelistAction({}, fd({
    name: "CRUD Test Pricelist",
    validFrom: "2026-10-01",
    validTo: "2026-11-15",
    isActive: "true",
  }));

  const list = await prisma.pricelist.findFirst({
    where: { name: "CRUD Test Pricelist" },
  });
  check("pricelist created", list !== null, true);
  check("not default", list?.isDefault, false);
  check("validity stored", list?.validFrom !== null, true);

  const badDates = await createPricelistAction({}, fd({
    name: "Bad Dates",
    validFrom: "2026-11-01",
    validTo: "2026-10-01",
  }));
  check("inverted date range rejected", Boolean(badDates.error), true);

  await savePriceGridAction({}, fd({
    pricelistId: list!.id,
    [`cell_${created!.id}_${daily.id}`]: 999,
  }));
  const gridItem = await prisma.pricelistItem.findFirst({
    where: { pricelistId: list!.id, productId: created!.id },
  });
  check("price grid saved", Number(gridItem?.price ?? 0), 999);

  // Blank cell should clear the rate.
  await savePriceGridAction({}, fd({
    pricelistId: list!.id,
    [`cell_${created!.id}_${daily.id}`]: "",
  }));
  check(
    "blank cell clears rate",
    await prisma.pricelistItem.count({
      where: { pricelistId: list!.id, productId: created!.id },
    }),
    0
  );

  const defaultList = await prisma.pricelist.findFirst({ where: { isDefault: true } });
  await deletePricelistAction(fd({ id: defaultList!.id }));
  check(
    "default pricelist protected from deletion",
    await prisma.pricelist.count({ where: { id: defaultList!.id } }),
    1
  );

  await deletePricelistAction(fd({ id: list!.id }));
  check(
    "non-default pricelist deleted",
    await prisma.pricelist.count({ where: { id: list!.id } }),
    0
  );

  // ---------------------------------------------------------- rental period
  console.log("\n--- rental period CRUD ---");
  await prisma.rentalPeriod.deleteMany({ where: { unit: "DAY", duration: 3 } });

  await createRentalPeriodAction({}, fd({ name: "Weekend", unit: "DAY", duration: 3 }));
  const weekend = await prisma.rentalPeriod.findFirst({
    where: { unit: "DAY", duration: 3 },
  });
  check("rental period created", weekend !== null, true);

  const dupePeriod = await createRentalPeriodAction({}, fd({
    name: "Weekend Again",
    unit: "DAY",
    duration: 3,
  }));
  check("duplicate unit+duration rejected", Boolean(dupePeriod.error), true);

  await deleteRentalPeriodAction(fd({ id: weekend!.id }));
  check(
    "unused rental period deleted",
    await prisma.rentalPeriod.count({ where: { id: weekend!.id } }),
    0
  );

  await deleteRentalPeriodAction(fd({ id: daily.id }));
  const dailyAfter = await prisma.rentalPeriod.findUnique({ where: { id: daily.id } });
  check("in-use rental period deactivated, not deleted", dailyAfter !== null, true);
  check("  and marked inactive", dailyAfter?.isActive, false);
  await prisma.rentalPeriod.update({ where: { id: daily.id }, data: { isActive: true } });

  // ---------------------------------------------------------------- settings
  console.log("\n--- settings ---");
  await saveSettingsAction({}, fd({
    companyName: "CRUD Test Rentals",
    currency: "INR",
    defaultDepositType: "PERCENTAGE",
    defaultDepositValue: 20,
    defaultGraceHours: 6,
    quotationValidDays: 14,
  }));

  const settings = await prisma.orgSettings.findUnique({ where: { id: "default" } });
  check("company name saved", settings?.companyName, "CRUD Test Rentals");
  check("grace hours saved", settings?.defaultGraceHours, 6);
  check("deposit type saved", settings?.defaultDepositType, "PERCENTAGE");

  // ----------------------------------------------------------- late fee rule
  console.log("\n--- late fee rule ---");
  await saveLateFeeRuleAction({}, fd({
    name: "CRUD Test Rule",
    unit: "HOUR",
    amountPerUnit: 75,
    graceHours: 1,
    maxAmount: "",
    isActive: "false",
  }));
  const rule = await prisma.lateFeeRule.findFirst({ where: { name: "CRUD Test Rule" } });
  check("rule created", rule !== null, true);
  check("blank max = uncapped", rule?.maxAmount, null);
  await prisma.lateFeeRule.delete({ where: { id: rule!.id } });

  // -------------------------------------------------------------- quotation
  console.log("\n--- quotation to order ---");
  const customer = await prisma.user.findFirstOrThrow({ where: { role: "CUSTOMER" } });
  const quotable = await prisma.product.findFirstOrThrow({
    where: { isRentable: true, pricelistItems: { some: { rentalPeriodId: daily.id } } },
  });

  const quoteResult = await createQuotationAction({}, fd({
    customerId: customer.id,
    productId: quotable.id,
    rentalPeriodId: daily.id,
    quantity: 2,
    rentalStart: "2026-12-01T10:00",
    rentalEnd: "2026-12-04T10:00",
    notes: "CRUD test quotation",
  }));
  check("quotation action succeeded", quoteResult.error ?? "none", "none");

  // Newest first: earlier runs leave confirmed test quotations behind, and
  // those can't be deleted because they own a rental order.
  const quotation = await prisma.quotation.findFirst({
    where: { notes: "CRUD test quotation" },
    orderBy: { createdAt: "desc" },
    include: { lines: true },
  });
  check("quotation created", quotation !== null, true);
  check("quotation is draft", quotation?.status, "DRAFT");
  check("quotation has a line", quotation?.lines.length, 1);
  check("rent computed", Number(quotation?.subtotal ?? 0) > 0, true);
  check("deposit computed", Number(quotation?.depositTotal ?? 0) > 0, true);

  try {
    await confirmQuotationAction(fd({ id: quotation!.id }));
  } catch {
    // confirmQuotationAction redirects on success.
  }

  const confirmed = await prisma.quotation.findUnique({
    where: { id: quotation!.id },
    include: {
      order: {
        include: { deposit: true, payments: true, invoices: true, pickup: true, return: true },
      },
    },
  });
  check("quotation confirmed", confirmed?.status, "CONFIRMED");
  check("rental order created", confirmed?.order !== null, true);
  check("deposit held on new order", confirmed?.order?.deposit?.status, "HELD");
  check("rent + deposit payments", confirmed?.order?.payments.length, 2);
  check("invoice raised", confirmed?.order?.invoices.length, 1);
  check("pickup scheduled", Boolean(confirmed?.order?.pickup), true);
  check("return scheduled", Boolean(confirmed?.order?.return), true);

  // ------------------------------------------------------------ delete rules
  console.log("\n--- delete protection ---");
  await deleteProductAction(fd({ id: created!.id }));
  check(
    "unused product hard-deleted",
    await prisma.product.count({ where: { id: created!.id } }),
    0
  );

  const rented = await prisma.rentalOrderLine.findFirstOrThrow({
    select: { productId: true },
  });
  await deleteProductAction(fd({ id: rented.productId }));
  const retired = await prisma.product.findUnique({ where: { id: rented.productId } });
  check("rented product retired, not deleted", retired !== null, true);
  check("  and hidden from catalogue", retired?.isRentable, false);
  await prisma.product.update({
    where: { id: rented.productId },
    data: { isRentable: true },
  });

  console.log(`\n${failed === 0 ? "ALL CRUD CHECKS PASSED" : `${failed} CHECK(S) FAILED`}`);
  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
