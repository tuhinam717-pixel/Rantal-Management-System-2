"use server";

import { revalidatePath } from "next/cache";
import type { ItemCondition } from "@prisma/client";

import { requireRole } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { lateFee } from "@/lib/rental/pricing";
import { parseScanCode } from "@/lib/rental/scan-code";
import { confirmPickup, processReturn } from "@/server/services/rentals";
import { formatCurrency } from "@/lib/utils";

export interface ScanResult {
  error?: string;
  /** Set after an action so the station can confirm what just happened. */
  done?: string;
  order?: {
    id: string;
    number: string;
    status: string;
    customerName: string;
    customerPhone: string | null;
    rentalStart: string;
    rentalEnd: string;
    items: string;
    depositAmount: number;
    firstProductId: string;
    /** What the scan station should offer next. */
    nextAction: "PICKUP" | "RETURN" | "NONE";
    penaltyAmount: number;
    penaltyUnits: number;
    penaltyUnit: string;
  };
}

/** Resolves a scanned code to the order and the action that makes sense next. */
export async function lookupScanAction(code: string): Promise<ScanResult> {
  await requireRole("ADMIN");

  const number = parseScanCode(code);
  if (!number) {
    return { error: "That code isn't a rental order number." };
  }

  const [order, rule] = await Promise.all([
    prisma.rentalOrder.findUnique({
      where: { number },
      include: {
        customer: { select: { name: true, phone: true } },
        deposit: true,
        pickup: true,
        return: true,
        lines: { include: { product: { select: { id: true, name: true } } } },
      },
    }),
    prisma.lateFeeRule.findFirst({ where: { isActive: true } }),
  ]);

  if (!order) {
    return { error: `No rental order found for ${number}.` };
  }

  const now = new Date();
  const penalty =
    rule && !order.returnedAt
      ? lateFee({
          dueAt: order.rentalEnd,
          returnedAt: now,
          unit: rule.unit,
          amountPerUnit: Number(rule.amountPerUnit),
          graceHours: rule.graceHours,
          maxAmount: rule.maxAmount == null ? null : Number(rule.maxAmount),
        })
      : { overdueUnits: 0, amount: 0 };

  const nextAction: "PICKUP" | "RETURN" | "NONE" = order.returnedAt
    ? "NONE"
    : order.pickup && order.pickup.status !== "COMPLETED"
      ? "PICKUP"
      : order.return && order.return.status !== "COMPLETED"
        ? "RETURN"
        : "NONE";

  return {
    order: {
      id: order.id,
      number: order.number,
      status: order.status,
      customerName: order.customer.name,
      customerPhone: order.customer.phone,
      rentalStart: order.rentalStart.toISOString(),
      rentalEnd: order.rentalEnd.toISOString(),
      items: order.lines
        .map((l) => `${l.product.name} x${l.quantity}`)
        .join(", "),
      depositAmount: Number(order.deposit?.amount ?? 0),
      firstProductId: order.lines[0]?.product.id ?? "",
      nextAction,
      penaltyAmount: penalty.amount,
      penaltyUnits: penalty.overdueUnits,
      penaltyUnit: rule?.unit ?? "DAY",
    },
  };
}

function refreshOps() {
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/pickups");
  revalidatePath("/admin/returns");
  revalidatePath("/admin/deposits");
  revalidatePath("/admin/late-fees");
}

/**
 * Confirms the pickup and returns the order's *new* state.
 *
 * The station holds its result in client state, so an action that returns
 * nothing would leave the card showing a stale "Confirm pickup" button and
 * look like nothing happened. Re-reading here keeps the UI honest.
 */
export async function scanConfirmPickupAction(
  orderId: string
): Promise<ScanResult> {
  await requireRole("ADMIN");

  const order = await prisma.rentalOrder.findUnique({
    where: { id: orderId },
    select: { number: true },
  });
  if (!order) return { error: "Order not found." };

  try {
    await confirmPickup(orderId);
  } catch (error) {
    console.error("[scan/pickup]", error);
    return { error: "Could not confirm the pickup. Try again." };
  }

  refreshOps();
  const refreshed = await lookupScanAction(order.number);
  return { ...refreshed, done: `Pickup confirmed for ${order.number}.` };
}

/** Receives the return, settles the deposit, and returns the new state. */
export async function scanProcessReturnAction(input: {
  orderId: string;
  productId: string;
  condition: ItemCondition;
  damageNote?: string;
  missingAccessories?: string;
  damageCharge?: number;
}): Promise<ScanResult> {
  await requireRole("ADMIN");

  const order = await prisma.rentalOrder.findUnique({
    where: { id: input.orderId },
    select: { number: true },
  });
  if (!order) return { error: "Order not found." };

  try {
    await processReturn(input.orderId, {
      inspections: input.productId
        ? [
            {
              productId: input.productId,
              condition: input.condition,
              damageNote: input.damageNote || undefined,
              missingAccessories: input.missingAccessories || undefined,
              repairRequired:
                input.condition === "DAMAGED" || input.condition === "UNUSABLE",
              damageCharge: input.damageCharge ?? 0,
            },
          ]
        : [],
    });
  } catch (error) {
    console.error("[scan/return]", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not receive the return. Try again.",
    };
  }

  refreshOps();

  const settled = await prisma.securityDeposit.findFirst({
    where: { order: { id: input.orderId } },
    select: { deductedAmount: true, refundedAmount: true },
  });

  const refreshed = await lookupScanAction(order.number);
  const refunded = Number(settled?.refundedAmount ?? 0);
  const deducted = Number(settled?.deductedAmount ?? 0);

  return {
    ...refreshed,
    done:
      deducted > 0
        ? `Return received. ${formatCurrency(deducted)} deducted, ${formatCurrency(refunded)} refunded in cash.`
        : `Return received on time. Full ${formatCurrency(refunded)} deposit refunded.`,
  };
}
