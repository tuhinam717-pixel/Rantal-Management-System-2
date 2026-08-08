import Link from "next/link";

import { Logo } from "@/components/ui/logo";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { requireRole } from "@/lib/auth/current-user";

const NAV = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/orders", label: "Rental orders" },
  { href: "/admin/pickups", label: "Pickups" },
  { href: "/admin/returns", label: "Returns" },
  { href: "/admin/deposits", label: "Deposits" },
  { href: "/admin/late-fees", label: "Late fees" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/pricelists", label: "Pricelists" },
  { href: "/admin/quotations", label: "Quotations" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/settings", label: "Settings" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("ADMIN");

  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard">
              <Logo />
            </Link>
            <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700 ring-1 ring-inset ring-brand-200">
              Admin
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-ink-500 sm:inline">
              {user.name}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-8 px-5 py-8">
        <aside className="hidden w-52 shrink-0 lg:block">
          <nav className="space-y-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-ink-500 transition-colors hover:bg-white hover:text-ink-900"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
