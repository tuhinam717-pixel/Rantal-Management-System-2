import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Admin@123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@rentflow.test" },
    update: {},
    create: {
      name: "Rental Admin",
      email: "admin@rentflow.test",
      passwordHash,
      role: "ADMIN",
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: "customer@rentflow.test" },
    update: {},
    create: {
      name: "Demo Customer",
      email: "customer@rentflow.test",
      passwordHash: await bcrypt.hash("Customer@123", 12),
      role: "CUSTOMER",
      cart: { create: {} },
    },
  });

  await prisma.orgSettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default", companyName: "RentFlow Rentals", currency: "INR" },
  });

  // The brief calls for one default pricelist applicable to every product.
  await prisma.pricelist.upsert({
    where: { id: "default-pricelist" },
    update: {},
    create: { id: "default-pricelist", name: "Standard Pricelist", isDefault: true },
  });

  const periods = [
    { name: "Hourly", unit: "HOUR" as const, duration: 1 },
    { name: "Daily", unit: "DAY" as const, duration: 1 },
    { name: "Weekly", unit: "WEEK" as const, duration: 1 },
    { name: "Monthly", unit: "MONTH" as const, duration: 1 },
  ];

  for (const period of periods) {
    await prisma.rentalPeriod.upsert({
      where: { unit_duration: { unit: period.unit, duration: period.duration } },
      update: {},
      create: period,
    });
  }

  await prisma.lateFeeRule.upsert({
    where: { id: "default-late-fee" },
    update: {},
    create: {
      id: "default-late-fee",
      name: "Standard daily late fee",
      unit: "DAY",
      amountPerUnit: 500,
      graceHours: 2,
    },
  });

  console.log("Seeded:", { admin: admin.email, customer: customer.email });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
