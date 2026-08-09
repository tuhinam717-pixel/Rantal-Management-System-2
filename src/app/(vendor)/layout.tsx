import { Boxes, LayoutDashboard, ScrollText, UserRound, Wrench } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { requireVendor } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

export default async function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, vendor } = await requireVendor();

  const openRepairs = await prisma.repairJob.count({
    where: { vendorId: vendor.id, status: { in: ["PENDING", "IN_PROGRESS"] } },
  });

  const groups = [
    {
      label: "Supply",
      items: [
        { href: "/vendor/dashboard", label: "Dashboard", icon: <LayoutDashboard className="size-4" /> },
        { href: "/vendor/products", label: "My products", icon: <Boxes className="size-4" /> },
        { href: "/vendor/activity", label: "Rental activity", icon: <ScrollText className="size-4" /> },
      ],
    },
    {
      label: "My account",
      items: [
        { href: "/vendor/repairs", label: "Repair jobs", icon: <Wrench className="size-4" />, badge: openRepairs },
        { href: "/vendor/profile", label: "Profile", icon: <UserRound className="size-4" /> },
      ],
    },
  ];

  return (
    <AppShell
      subtitle="Vendor portal"
      roleLabel="Vendor"
      homeHref="/vendor/dashboard"
      user={{ ...user, name: vendor.name }}
      groups={groups}
    >
      {children}
    </AppShell>
  );
}
