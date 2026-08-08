import Link from "next/link";
import { Bell, ShoppingCart } from "lucide-react";

import { Logo } from "@/components/ui/logo";
import { PortalNavLink } from "@/components/layout/portal-nav-link";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { requireUser } from "@/lib/auth/current-user";
import { getCartCount } from "@/server/services/cart";
import { getUnreadCount } from "@/server/services/notifications";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/products", label: "Browse" },
  { href: "/orders", label: "My rentals" },
  { href: "/profile", label: "Profile" },
];

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const [cartCount, unread] = await Promise.all([
    getCartCount(user.id),
    getUnreadCount(user.id),
  ]);

  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-5">
          <Link href="/dashboard" className="shrink-0">
            <Logo />
          </Link>

          <nav className="hidden gap-6 md:flex">
            {NAV.map((item) => (
              <PortalNavLink key={item.href} href={item.href}>
                {item.label}
              </PortalNavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/notifications"
              className="relative grid size-9 place-items-center rounded-lg text-ink-700 transition-colors hover:bg-slate-100"
              aria-label={`Notifications, ${unread} unread`}
            >
              <Bell className="size-5" aria-hidden />
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid min-w-4.5 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
                  {unread}
                </span>
              )}
            </Link>

            <Link
              href="/cart"
              className="relative grid size-9 place-items-center rounded-lg text-ink-700 transition-colors hover:bg-slate-100"
              aria-label={`Cart, ${cartCount} item${cartCount === 1 ? "" : "s"}`}
            >
              <ShoppingCart className="size-5" aria-hidden />
              {cartCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid min-w-4.5 place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-semibold text-white">
                  {cartCount}
                </span>
              )}
            </Link>

            <span className="hidden text-sm text-ink-500 sm:inline">
              {user.name}
            </span>
            <SignOutButton />
          </div>
        </div>

        {/* Below md the top nav collapses into this scrollable strip. */}
        <nav className="flex gap-1 overflow-x-auto border-t border-slate-200 px-4 py-2 md:hidden">
          {NAV.map((item) => (
            <PortalNavLink key={item.href} href={item.href} pill>
              {item.label}
            </PortalNavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
    </div>
  );
}
