"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

export type RepairState = { error?: string; ok?: boolean };

function refresh() {
  revalidatePath("/admin/repairs");
  revalidatePath("/admin/products");
  revalidatePath("/products");
  revalidatePath("/admin/dashboard");
}

export async function startRepairAction(formData: FormData) {
  await requireRole("ADMIN");
  const id = String(formData.get("id") ?? "");
  const assignedTo = String(formData.get("assignedTo") ?? "").trim();
  if (!id) return;

  await prisma.repairJob.update({
    where: { id },
    data: {
      status: "IN_PROGRESS",
      startedAt: new Date(),
      assignedTo: assignedTo || undefined,
    },
  });

  refresh();
}

const completeSchema = z.object({
  id: z.string().min(1),
  actualCost: z.coerce.number().min(0),
  notes: z.string().optional(),
});

/**
 * Closes a job and returns the units to service.
 *
 * Both the stock adjustment and the status change happen together: a crash
 * between them would leave units invisible forever.
 */
export async function completeRepairAction(
  _prev: RepairState,
  formData: FormData
): Promise<RepairState> {
  await requireRole("ADMIN");

  const parsed = completeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const job = await prisma.repairJob.findUnique({ where: { id: parsed.data.id } });
  if (!job) return { error: "Repair job not found." };
  if (job.status === "COMPLETED" || job.status === "WRITTEN_OFF") {
    return { error: "This job is already closed." };
  }

  await prisma.$transaction([
    prisma.repairJob.update({
      where: { id: job.id },
      data: {
        status: "COMPLETED",
        actualCost: parsed.data.actualCost,
        notes: parsed.data.notes || undefined,
        completedAt: new Date(),
      },
    }),
    prisma.product.update({
      where: { id: job.productId },
      data: { underRepairStock: { decrement: job.quantity } },
    }),
  ]);

  refresh();
  return { ok: true };
}

/**
 * Writes the units off. They leave repair *and* leave total stock, because the
 * business no longer owns anything rentable.
 */
export async function writeOffRepairAction(
  _prev: RepairState,
  formData: FormData
): Promise<RepairState> {
  await requireRole("ADMIN");

  const id = String(formData.get("id") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  if (!id) return { error: "Missing job." };

  const job = await prisma.repairJob.findUnique({ where: { id } });
  if (!job) return { error: "Repair job not found." };
  if (job.status === "COMPLETED" || job.status === "WRITTEN_OFF") {
    return { error: "This job is already closed." };
  }

  await prisma.$transaction([
    prisma.repairJob.update({
      where: { id },
      data: {
        status: "WRITTEN_OFF",
        notes: notes || undefined,
        completedAt: new Date(),
      },
    }),
    prisma.product.update({
      where: { id: job.productId },
      data: {
        underRepairStock: { decrement: job.quantity },
        totalStock: { decrement: job.quantity },
      },
    }),
  ]);

  refresh();
  return { ok: true };
}

const openSchema = z.object({
  productId: z.string().min(1, "Choose a product"),
  issue: z.string().min(3, "Describe the problem"),
  quantity: z.coerce.number().int().min(1),
  estimatedCost: z.coerce.number().min(0),
  assignedTo: z.string().optional(),
});

/** Manual entry, for damage spotted outside a return inspection. */
export async function openRepairAction(
  _prev: RepairState,
  formData: FormData
): Promise<RepairState> {
  await requireRole("ADMIN");

  const parsed = openSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const product = await prisma.product.findUnique({
    where: { id: parsed.data.productId },
  });
  if (!product) return { error: "Product not found." };

  const available =
    product.totalStock - product.reservedStock - product.underRepairStock;
  if (parsed.data.quantity > available) {
    return {
      error: `Only ${available} unit(s) are free to withdraw. The rest are rented out or already in repair.`,
    };
  }

  await prisma.$transaction([
    prisma.repairJob.create({
      data: {
        productId: parsed.data.productId,
        issue: parsed.data.issue,
        quantity: parsed.data.quantity,
        estimatedCost: parsed.data.estimatedCost,
        assignedTo: parsed.data.assignedTo || undefined,
      },
    }),
    prisma.product.update({
      where: { id: parsed.data.productId },
      data: { underRepairStock: { increment: parsed.data.quantity } },
    }),
  ]);

  refresh();
  return { ok: true };
}
