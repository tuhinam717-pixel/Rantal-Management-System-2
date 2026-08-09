import {
  BarChart3,
  Boxes,
  Building2,
  CalendarRange,
  Coins,
  FileSpreadsheet,
  LayoutDashboard,
  Radio,
  ScanLine,
  ScrollText,
  Settings,
  ShieldCheck,
  Sparkles,
  Tags,
  Truck,
  Undo2,
  Users,
  Wrench,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { requireRole } from "@/lib/auth/current-user";

/** Grouped so configuration is visibly separate from day-to-day operations. */
const NAV_GROUPS = [
  {
    label: "Operations",
    items: [
      { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/orders", label: "Rental orders", icon: ScrollText },
      { href: "/admin/pickups", label: "Pickups", icon: Truck },
      { href: "/admin/returns", label: "Returns", icon: Undo2 },
      { href: "/admin/scan", label: "Scan", icon: ScanLine },
      { href: "/admin/repairs", label: "Repairs", icon: Wrench },
      { href: "/admin/assets", label: "Asset tracking", icon: Radio },
    ],
  },
  {
    label: "Money",
    items: [
      { href: "/admin/deposits", label: "Deposits", icon: ShieldCheck },
      { href: "/admin/late-fees", label: "Late fees", icon: Coins },
      { href: "/admin/quotations", label: "Quotations", icon: FileSpreadsheet },
      { href: "/admin/reports", label: "Reports", icon: BarChart3 },
      { href: "/admin/insights", label: "Insights", icon: Sparkles },
    ],
  },
  {
    label: "Configuration",
    items: [
      { href: "/admin/products", label: "Products", icon: Boxes },
      { href: "/admin/pricelists", label: "Pricelists", icon: Tags },
      { href: "/admin/rental-periods", label: "Rental periods", icon: CalendarRange },
      { href: "/admin/customers", label: "Customers", icon: Users },
      { href: "/admin/vendors", label: "Vendors", icon: Building2 },
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("ADMIN");

  return (
    <AppShell
      subtitle="Admin console"
      roleLabel="Administrator"
      homeHref="/admin/dashboard"
      user={user}
      groups={NAV_GROUPS.map((group) => ({
        label: group.label,
        items: group.items.map(({ href, label, icon: Icon }) => ({
          href,
          label,
          icon: <Icon className="size-4" />,
        })),
      }))}
    >
      {children}
    </AppShell>
  );
}
