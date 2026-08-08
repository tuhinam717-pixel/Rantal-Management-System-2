"use server";

import { requireRole } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { lateFee } from "@/lib/rental/pricing";
import { parseScanCode } from "@/lib/rental/scan-code";

export interface ScanResult {
  error?: string;
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
