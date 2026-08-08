/**
 * Removes the account created while verifying the checkout flow, so the demo
 * data stays clean. Safe to re-run.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const EMAIL = "checkout.test@rentflow.test";

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: EMAIL },
    include: { _count: { select: { orders: true, addresses: true } } },
  });

  if (!user) {
    console.log(`No account for ${EMAIL} — nothing to clean up.`);
    return;
  }

  if (user._count.orders > 0) {
    console.log(
      `${EMAIL} has ${user._count.orders} order(s); leaving it alone rather than destroying order history.`
    );
    return;
  }

  await prisma.user.delete({ where: { id: user.id } });
  console.log(`Removed ${EMAIL} (${user._count.addresses} address(es), cart).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
