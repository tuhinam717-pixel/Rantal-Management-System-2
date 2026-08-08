import "server-only";

import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";

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
  if (user.role !== role) redirect("/dashboard");
  return user;
}
