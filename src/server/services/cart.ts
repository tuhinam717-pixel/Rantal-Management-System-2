import "server-only";

import { prisma } from "@/lib/prisma";
import { billableUnits, lineDeposit, lineRent, round2 } from "@/lib/rental/pricing";
import { getActivePricelistId } from "@/server/services/catalog";
import type { CartItemVM } from "@/types";

/** Every signed-in customer has exactly one cart; create it lazily. */
export async function getOrCreateCart(userId: string) {
  const existing = await prisma.cart.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.cart.create({ data: { userId } });
}

export interface CartSummary {
  items: CartItemVM[];
  rentTotal: number;
  depositTotal: number;
  grandTotal: number;
}

export async function getCart(userId: string): Promise<CartSummary> {
  const cart = await getOrCreateCart(userId);
  const pricelistId = await getActivePricelistId();

  const items = await prisma.cartItem.findMany({
    where: { cartId: cart.id },
    orderBy: { id: "asc" },
    include: {
      product: true,
      rentalPeriod: true,
    },
  });

  const priced = await Promise.all(
    items.map(async (item) => {
      const pricelistItem = await prisma.pricelistItem.findUnique({
        where: {
          pricelistId_productId_rentalPeriodId: {
            pricelistId,
            productId: item.productId,
            rentalPeriodId: item.rentalPeriodId,
          },
        },
      });

      const unitPrice = Number(pricelistItem?.price ?? 0);
      const units = billableUnits(
        item.rentalStart,
        item.rentalEnd,
        item.rentalPeriod.unit,
        item.rentalPeriod.duration
      );
      const rent = lineRent(unitPrice, units, item.quantity);
      const deposit = lineDeposit(
        item.product.depositType,
        Number(item.product.depositValue),
        item.quantity,
        rent
      );

      const vm: CartItemVM = {
        id: item.id,
        product: {
          id: item.product.id,
          name: item.product.name,
          slug: item.product.slug,
          imageUrl: item.product.imageUrl ?? undefined,
        },
        rentalPeriod: {
          id: item.rentalPeriod.id,
          name: item.rentalPeriod.name,
          unit: item.rentalPeriod.unit,
          duration: item.rentalPeriod.duration,
          price: unitPrice,
        },
        quantity: item.quantity,
        rentalStart: item.rentalStart.toISOString(),
        rentalEnd: item.rentalEnd.toISOString(),
        lineTotal: rent,
        depositAmount: deposit,
      };

      return vm;
    })
  );

  const rentTotal = round2(priced.reduce((sum, i) => sum + i.lineTotal, 0));
  const depositTotal = round2(
    priced.reduce((sum, i) => sum + i.depositAmount, 0)
  );

  return {
    items: priced,
    rentTotal,
    depositTotal,
    grandTotal: round2(rentTotal + depositTotal),
  };
}

export async function getCartCount(userId: string): Promise<number> {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    select: { _count: { select: { items: true } } },
  });
  return cart?._count.items ?? 0;
}

export async function addToCart(
  userId: string,
  input: {
    productId: string;
    rentalPeriodId: string;
    quantity: number;
    rentalStart: Date;
    rentalEnd: Date;
  }
) {
  const cart = await getOrCreateCart(userId);

  // Same product, same period, same dates -> bump the quantity instead of
  // stacking duplicate rows.
  const existing = await prisma.cartItem.findFirst({
    where: {
      cartId: cart.id,
      productId: input.productId,
      rentalPeriodId: input.rentalPeriodId,
      rentalStart: input.rentalStart,
      rentalEnd: input.rentalEnd,
    },
  });

  if (existing) {
    return prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + input.quantity },
    });
  }

  return prisma.cartItem.create({
    data: { cartId: cart.id, ...input },
  });
}

export async function updateCartItemQuantity(
  userId: string,
  itemId: string,
  quantity: number
) {
  const cart = await getOrCreateCart(userId);

  if (quantity <= 0) return removeCartItem(userId, itemId);

  // Scope by cartId so one user can't edit another's line by guessing an id.
  await prisma.cartItem.updateMany({
    where: { id: itemId, cartId: cart.id },
    data: { quantity },
  });
}

export async function removeCartItem(userId: string, itemId: string) {
  const cart = await getOrCreateCart(userId);
  await prisma.cartItem.deleteMany({ where: { id: itemId, cartId: cart.id } });
}

export async function clearCart(userId: string) {
  const cart = await getOrCreateCart(userId);
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
}
