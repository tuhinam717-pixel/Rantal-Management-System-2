import Link from "next/link";
import {
  Bell,
  CreditCard,
  LayoutDashboard,
  MapPin,
  ScrollText,
  Search,
  ShoppingCart,
  Store,
  UserRound,
} from "lucide-react";

import { AppImage } from "@/components/ui/app-image";
import { Logo } from "@/components/ui/logo";
import { PortalMobileNav } from "@/components/layout/portal-mobile-nav";
import { PortalNavLink } from "@/components/layout/portal-nav-link";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { requireUser } from "@/lib/auth/current-user";
import { getCartCount } from "@/server/services/cart";
import { getUnreadCount } from "@/server/services/notifications";

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

  /** Grouped so shopping is visibly separate from account management. */
  const groups = [
    {
      label: "Shop",
      items: [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/products", label: "Browse rentals", icon: Store },
        { href: "/cart", label: "Cart", icon: ShoppingCart, badge: cartCount },
      ],
    },
    {
      label: "My account",
      items: [
        { href: "/orders", label: "My rentals", icon: ScrollText },
        { href: "/notifications", label: "Notifications", icon: Bell, badge: unread },
        { href: "/profile", label: "Profile", icon: UserRound },
        { href: "/profile/addresses", label: "Addresses", icon: MapPin },
        { href: "/profile/payment-methods", label: "Payment methods", icon: CreditCard },
      ],
    },
  ];

  // Rendered once, used by both the fixed rail and the mobile drawer.
  const nav = (
    <>
      <div className="flex h-16 items-center border-b border-slate-200 px-5">
        <Link href="/dashboard">
          <Logo />
        </Link>
      </div>

      <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
        <span className="relative size-10 shrink-0 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
          {user.imageUrl ? (
            <AppImage
              src={user.imageUrl}
              alt=""
              fill
              sizes="40px"
              className="object-cover"
            />
          ) : (
            <span className="grid size-full place-items-center text-slate-400">
              <UserRound className="size-5" aria-hidden />
            </span>
          )}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-ink-900">
            {user.name}
          </span>
          <span className="block truncate text-xs text-ink-500">
            {user.email}
          </span>
        </span>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="px-2 pb-2 text-xs font-medium uppercase tracking-wide text-ink-400">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <PortalNavLink
                  key={item.href}
                  href={item.href}
                  icon={<item.icon className="size-4" />}
                  badge={"badge" in item ? item.badge : undefined}
                >
                  {item.label}
                </PortalNavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-200 p-3">
        <SignOutButton />
      </div>
    </>
  );

  return (
    <div className="min-h-dvh bg-slate-50 lg:flex">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        {nav}
      </aside>

      <div className="min-w-0 flex-1">
        {/*
          Top bar on every breakpoint. The sidebar owns navigation, so this
          carries the utilities: catalogue search, notifications, cart and who
          you are signed in as. Below lg it also holds the drawer toggle and
          the logo, which live in the rail on wider screens.
        */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <PortalMobileNav>{nav}</PortalMobileNav>

            <Link href="/dashboard" className="lg:hidden">
              <Logo />
            </Link>

            <form
              action="/products"
              role="search"
              className="hidden min-w-0 max-w-sm flex-1 sm:block"
            >
              <label htmlFor="portal-search" className="sr-only">
                Search rentals
              </label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400"
                  aria-hidden
                />
                <input
                  id="portal-search"
                  name="q"
                  type="search"
                  placeholder="Search rentals…"
                  className="w-full rounded-lg border-0 bg-slate-50 py-2 pl-9 pr-3 text-sm text-ink-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-inset focus:ring-brand-600"
                />
              </div>
            </form>
          </div>

          <div className="flex shrink-0 items-center gap-1">
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

            <Link
              href="/profile"
              className="ml-1 hidden items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition-colors hover:bg-slate-100 lg:flex"
            >
              <span className="relative size-8 shrink-0 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
                {user.imageUrl ? (
                  <AppImage
                    src={user.imageUrl}
                    alt=""
                    fill
                    sizes="32px"
                    className="object-cover"
                  />
                ) : (
                  <span className="grid size-full place-items-center text-slate-400">
                    <UserRound className="size-4" aria-hidden />
                  </span>
                )}
              </span>
              <span className="max-w-32 truncate text-sm font-medium text-ink-700">
                {user.name}
              </span>
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-5 py-8">{children}</main>
      </div>
    </div>
  );
}
