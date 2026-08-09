import Link from "next/link";
import { Boxes, Building2, LayoutDashboard, Wrench } from "lucide-react";

import { PortalMobileNav } from "@/components/layout/portal-mobile-nav";
import { PortalNavLink } from "@/components/layout/portal-nav-link";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { requireVendor } from "@/lib/auth/current-user";
import { APP_NAME } from "@/lib/constants";

const NAV = [
  { href: "/vendor/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/vendor/products", label: "My products", icon: Boxes },
  { href: "/vendor/repairs", label: "Repair jobs", icon: Wrench },
];

const ALL_HREFS = NAV.map((item) => item.href);

export default async function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { vendor } = await requireVendor();

  const nav = (
    <>
      <div className="flex h-16 items-center gap-2.5 border-b border-white/10 px-5">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-600 text-white">
          <Building2 className="size-4" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-white">
            {APP_NAME}
          </span>
          <span className="block text-xs text-slate-400">Vendor portal</span>
        </span>
      </div>

      <div className="border-b border-white/10 px-5 py-4">
        <p className="truncate text-sm font-medium text-white">{vendor.name}</p>
        <p className="truncate text-xs text-slate-400">
          {[vendor.city, vendor.state].filter(Boolean).join(", ") ||
            "Supplier account"}
        </p>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-5">
        {NAV.map((item) => (
          <PortalNavLink
            key={item.href}
            href={item.href}
            icon={<item.icon className="size-4" />}
            siblings={ALL_HREFS}
          >
            {item.label}
          </PortalNavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <SignOutButton />
      </div>
    </>
  );

  return (
    <div className="min-h-dvh bg-slate-100 lg:flex">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col bg-ink-900 lg:flex">
        {nav}
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:px-8">
          <div className="flex items-center gap-2">
            <PortalMobileNav>{nav}</PortalMobileNav>
            <Link
              href="/vendor/dashboard"
              className="text-sm font-semibold text-ink-900 lg:hidden"
            >
              Vendor portal
            </Link>
          </div>

          <span className="hidden text-sm text-ink-500 lg:block">
            Signed in as{" "}
            <span className="font-medium text-ink-900">{vendor.name}</span>
            <span className="ml-2 rounded-full bg-ink-900 px-2 py-0.5 text-xs font-medium text-white">
              Vendor
            </span>
          </span>
        </header>

        <main className="mx-auto max-w-5xl px-5 py-8">{children}</main>
      </div>
    </div>
  );
}
