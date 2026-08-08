"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { WIDGETS } from "@/lib/dashboard-widgets";

const VALID = new Set<string>(WIDGETS.map((w) => w.key));

export async function saveWidgetsAction(keys: string[]) {
  const user = await requireRole("ADMIN");

  // Filter against the known set so a crafted payload can't store junk that
  // the dashboard would then have to defend against on every read.
  const clean = keys.filter((key) => VALID.has(key));

  await prisma.user.update({
    where: { id: user.id },
    data: {
      // Selecting nothing means "go back to the defaults", which is null.
      dashboardWidgets: clean.length === 0 ? null : JSON.stringify(clean),
    },
  });

  revalidatePath("/admin/dashboard");
}
