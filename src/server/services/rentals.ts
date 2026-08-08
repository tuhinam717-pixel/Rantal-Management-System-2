import "server-only";

import type { ItemCondition } from "@prisma/client";

import { LONG_TRANSACTION, prisma } from "@/lib/prisma";
import { lateFee, round2, settleDeposit } from "@/lib/rental/pricing";

/**
 * The back half of the rental lifecycle: pickup confirmation, overdue
 * detection, and the return that settles the deposit.
 */

async function activeLateFeeRule() {
  const rule = await prisma.lateFeeRule.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  });

  if (rule) return rule;

  // Fall back to org defaults so a return never fails for want of a rule.
  const settings = await prisma.orgSettings.findUnique({
    where: { id: "default" },
  });

  return {
    id: null as string | null,
    unit: "DAY" as const,
    amountPerUnit: 0,
    graceHours: settings?.defaultGraceHours ?? 0,
    maxAmount: null,
  };
}

/** Marks a scheduled pickup as handed over and moves the order to PICKED_UP. */
export async function confirmPickup(orderId: string, note?: string) {
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    await tx.pickup.update({
      where: { orderId },
      data: { status: "COMPLETED", confirmedAt: now, notes: note },
    });

    return tx.rentalOrder.update({
      where: { id: orderId },
      data: { status: "PICKED_UP" },
    });
  });
}

/**
 * Sweeps for rentals that are past their return date and not back yet, and
 * flips them to OVERDUE. Safe to run repeatedly — it only touches orders whose
 * status hasn't already been advanced past the point of no return.
 */
export async function markOverdueRentals(now = new Date()) {
  const result = await prisma.rentalOrder.updateMany({
    where: {
      rentalEnd: { lt: now },
      returnedAt: null,
      status: {
        in: ["CONFIRMED", "READY_FOR_PICKUP", "PICKED_UP", "ACTIVE", "RETURN_DUE"],
      },
    },
    data: { status: "OVERDUE" },
  });

  if (result.count > 0) {
    await prisma.return.updateMany({
      where: {
        scheduledFor: { lt: now },
        receivedAt: null,
        status: "SCHEDULED",
      },
      data: { isLate: true },
    });
  }

  return result.count;
}

/** What a return would cost, without writing anything. Used to preview. */
export async function previewSettlement(orderId: string, returnedAt = new Date()) {
  const order = await prisma.rentalOrder.findUniqueOrThrow({
    where: { id: orderId },
    include: { deposit: true },
  });

  const rule = await activeLateFeeRule();
  const penalty = lateFee({
    dueAt: order.rentalEnd,
    returnedAt,
    unit: rule.unit,
    amountPerUnit: Number(rule.amountPerUnit),
    graceHours: rule.graceHours,
    maxAmount: rule.maxAmount == null ? null : Number(rule.maxAmount),
  });

  const depositAmount = Number(order.deposit?.amount ?? 0);
  const split = settleDeposit(depositAmount, penalty.amount);

  return { order, depositAmount, penalty, ...split };
}

export interface InspectionInput {
  productId: string;
  condition: ItemCondition;
  damageNote?: string;
  missingAccessories?: string;
  repairRequired?: boolean;
  damageCharge?: number;
}

/**
 * Receives a return and settles the money in one transaction.
 *
 * Straight from the brief: on time means the whole deposit goes back; late
 * means the penalty is deducted from the deposit and the balance refunded in
 * cash. Damage charges from the inspection are deducted the same way.
 */
export async function processReturn(
  orderId: string,
  input: {
    returnedAt?: Date;
    inspections?: InspectionInput[];
    note?: string;
  } = {}
) {
  const returnedAt = input.returnedAt ?? new Date();
  const rule = await activeLateFeeRule();

  const order = await prisma.rentalOrder.findUniqueOrThrow({
    where: { id: orderId },
    include: { deposit: true, lines: true },
  });

  if (order.returnedAt) {
    throw new Error(`Order ${order.number} has already been returned.`);
  }

  const penalty = lateFee({
    dueAt: order.rentalEnd,
    returnedAt,
    unit: rule.unit,
    amountPerUnit: Number(rule.amountPerUnit),
    graceHours: rule.graceHours,
    maxAmount: rule.maxAmount == null ? null : Number(rule.maxAmount),
  });

  const damageCharge = round2(
    (input.inspections ?? []).reduce((sum, i) => sum + (i.damageCharge ?? 0), 0)
  );

  const depositAmount = Number(order.deposit?.amount ?? 0);
  const totalDeduction = round2(penalty.amount + damageCharge);
  const split = settleDeposit(depositAmount, totalDeduction);

  return prisma.$transaction(async (tx) => {
    const returnRow = await tx.return.update({
      where: { orderId },
      data: {
        receivedAt: returnedAt,
        status: "COMPLETED",
        isLate: penalty.amount > 0,
        notes: input.note,
      },
    });

    for (const inspection of input.inspections ?? []) {
      const repairRequired = inspection.repairRequired ?? false;

      const row = await tx.returnInspection.create({
        data: {
          returnId: returnRow.id,
          productId: inspection.productId,
          condition: inspection.condition,
          damageNote: inspection.damageNote,
          missingAccessories: inspection.missingAccessories,
          repairRequired,
          damageCharge: inspection.damageCharge ?? 0,
          inspectedAt: returnedAt,
        },
      });

      // "Repair workflow initiation when required" from the brief: a damaged
      // return opens a job and withdraws the unit from availability, so it
      // can't be re-rented while it's broken.
      if (repairRequired) {
        const quantity =
          order.lines.find((l) => l.productId === inspection.productId)
            ?.quantity ?? 1;

        await tx.repairJob.create({
          data: {
            productId: inspection.productId,
            inspectionId: row.id,
            orderNumber: order.number,
            issue:
              inspection.damageNote?.trim() ||
              `Returned ${inspection.condition.replace(/_/g, " ").toLowerCase()}`,
            quantity,
            estimatedCost: inspection.damageCharge ?? 0,
            status: "PENDING",
            openedAt: returnedAt,
          },
        });

        await tx.product.update({
          where: { id: inspection.productId },
          data: { underRepairStock: { increment: quantity } },
        });
      }
    }

    if (penalty.amount > 0) {
      await tx.lateFee.create({
        data: {
          orderId,
          ruleId: rule.id ?? undefined,
          overdueUnits: penalty.overdueUnits,
          amount: penalty.amount,
          status: "DEDUCTED_FROM_DEPOSIT",
          calculatedAt: returnedAt,
        },
      });

      // A penalty larger than the deposit still owes money; invoice the gap.
      if (split.shortfall > 0) {
        const invoiceCount = await tx.invoice.count();
        await tx.invoice.create({
          data: {
            number: `INV-${returnedAt.getFullYear()}-${String(invoiceCount + 1).padStart(4, "0")}`,
            orderId,
            kind: "LATE_FEE",
            amount: split.shortfall,
            issuedAt: returnedAt,
          },
        });
      }
    }

    if (order.deposit) {
      await tx.securityDeposit.update({
        where: { id: order.deposit.id },
        data: {
          deductedAmount: split.deducted,
          refundedAmount: split.refunded,
          status: split.deducted === 0 ? "REFUNDED" : split.refunded === 0 ? "FORFEITED" : "PARTIALLY_REFUNDED",
          settledAt: returnedAt,
          transactions: {
            create: [
              ...(split.deducted > 0
                ? [
                    {
                      type: "DEDUCTION" as const,
                      amount: split.deducted,
                      note:
                        damageCharge > 0 && penalty.amount > 0
                          ? "Late return penalty and damage charges"
                          : damageCharge > 0
                            ? "Damage charges"
                            : `Late return penalty (${penalty.overdueUnits} ${rule.unit.toLowerCase()}s overdue)`,
                      createdAt: returnedAt,
                    },
                  ]
                : []),
              ...(split.refunded > 0
                ? [
                    {
                      type: "REFUND" as const,
                      amount: split.refunded,
                      note:
                        split.deducted > 0
                          ? "Balance refunded in cash"
                          : "Returned on time, full refund",
                      createdAt: returnedAt,
                    },
                  ]
                : []),
            ],
          },
        },
      });

      if (split.refunded > 0) {
        await tx.payment.create({
          data: {
            orderId,
            purpose: "REFUND",
            status: "PAID",
            amount: split.refunded,
            method: "Cash",
            paidAt: returnedAt,
          },
        });
      }
    }

    // Release the stock this order was holding.
    for (const line of order.lines) {
      await tx.product.update({
        where: { id: line.productId },
        data: { reservedStock: { decrement: line.quantity } },
      });
    }

    return tx.rentalOrder.update({
      where: { id: orderId },
      data: {
        status: "COMPLETED",
        returnedAt,
        lateFeeTotal: penalty.amount,
      },
    });
  }, LONG_TRANSACTION);
}
