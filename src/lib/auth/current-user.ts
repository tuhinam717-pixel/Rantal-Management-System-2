import "server-only";

import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";

import { ROLE_HOME } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";

/** The signed-in user, re-read from the database (null when signed out). */
export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      imageUrl: true,
      dashboardWidgets: true,
      isActive: true,
      createdAt: true,
    },
  });

  return user?.isActive ? user : null;
}

/** Use in server components/actions that must not render for anonymous users. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(role: Role) {
  const user = await requireUser();
  // Bounce to the caller's own home: a vendor sent to /dashboard would land in
  // the customer portal instead of anywhere useful.
  if (user.role !== role) redirect(ROLE_HOME[user.role] ?? "/dashboard");
  return user;
}

/**
 * The signed-in supplier plus the vendor record they act for.
 *
 * Every vendor screen filters on the returned `vendor.id`, which is how one
 * supplier is kept from seeing another's stock. An account whose vendor row was
 * deleted has nothing to show, so it is signed out rather than shown an empty
 * console.
 */
export async function requireVendor() {
  const user = await requireRole("VENDOR");

  const vendor = await prisma.vendor.findUnique({
    where: { userId: user.id },
  });

  if (!vendor || !vendor.isActive) redirect("/login?error=vendor-inactive");

  return { user, vendor };
}
