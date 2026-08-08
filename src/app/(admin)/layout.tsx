import Link from "next/link";
import {
  BarChart3,
  Boxes,
  CalendarRange,
  Coins,
  FileSpreadsheet,
  LayoutDashboard,
  PackageCheck,
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

import { AdminMobileNav } from "@/components/layout/admin-mobile-nav";
import { AdminNavLink } from "@/components/layout/admin-nav-link";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { requireRole } from "@/lib/auth/current-user";
import { APP_NAME } from "@/lib/constants";

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
    <div className="min-h-dvh bg-slate-100 lg:flex">
      {/*
        Dark rail: the admin console should never be mistaken for the portal.
        `sticky top-0 h-dvh` pins it while the page scrolls; the nav below
        scrolls internally when the link list is taller than the viewport.
      */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col bg-ink-900 lg:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-white/10 px-5">
          <span className="grid size-8 place-items-center rounded-lg bg-brand-600 text-white">
            <PackageCheck className="size-4" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-white">
              {APP_NAME}
            </span>
            <span className="block text-xs text-slate-400">Admin console</span>
          </span>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="px-2 pb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <AdminNavLink
                    key={item.href}
                    href={item.href}
                    icon={<item.icon className="size-4" />}
                  >
                    {item.label}
                  </AdminNavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3">
          <Link
            href="/dashboard"
            className="block rounded-lg px-3 py-2 text-xs text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            View customer portal
          </Link>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex h-16 items-center justify-between gap-4 px-5 lg:px-8">
            <div className="flex items-center gap-2 lg:hidden">
              <AdminMobileNav
                groups={NAV_GROUPS.map((group) => ({
                  label: group.label,
                  items: group.items.map(({ href, label }) => ({ href, label })),
                }))}
              />
              <span className="grid size-8 place-items-center rounded-lg bg-ink-900 text-white">
                <PackageCheck className="size-4" aria-hidden />
              </span>
              <span className="text-sm font-semibold text-ink-900">
                Admin console
              </span>
            </div>

            <span className="hidden text-sm text-ink-500 lg:block">
              Signed in as{" "}
              <span className="font-medium text-ink-900">{user.name}</span>
              <span className="ml-2 rounded-full bg-ink-900 px-2 py-0.5 text-xs font-medium text-white">
                Administrator
              </span>
            </span>

            <SignOutButton />
          </div>
        </header>

        <main className="px-5 py-8 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
