import Link from "next/link";
import {
  Bell,
  CreditCard,
  FileText,
  LayoutDashboard,
  MapPin,
  Radar,
  ScrollText,
  ShoppingCart,
  Store,
  UserRound,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { CatalogueSearch } from "@/components/layout/catalogue-search";
import { requireUser } from "@/lib/auth/current-user";
import { getCartCount } from "@/server/services/cart";
import { getUnreadCount } from "@/server/services/notifications";
import { countPendingQuotations } from "@/server/services/quotations";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const [cartCount, unread, pendingQuotes] = await Promise.all([
    getCartCount(user.id),
    getUnreadCount(user.id),
    countPendingQuotations(user.id),
  ]);

  /** Grouped so shopping is visibly separate from account management. */
  const groups = [
    {
      label: "Shop",
      items: [
        { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="size-4" /> },
        { href: "/products", label: "Browse rentals", icon: <Store className="size-4" /> },
        { href: "/cart", label: "Cart", icon: <ShoppingCart className="size-4" />, badge: cartCount },
      ],
    },
    {
      label: "My account",
      items: [
        { href: "/orders", label: "My rentals", icon: <ScrollText className="size-4" /> },
        { href: "/tracking", label: "Track rentals", icon: <Radar className="size-4" /> },
        { href: "/quotations", label: "Quotations", icon: <FileText className="size-4" />, badge: pendingQuotes },
        { href: "/notifications", label: "Notifications", icon: <Bell className="size-4" />, badge: unread },
        { href: "/profile", label: "Profile", icon: <UserRound className="size-4" /> },
        { href: "/profile/addresses", label: "Addresses", icon: <MapPin className="size-4" /> },
        { href: "/profile/payment-methods", label: "Payment methods", icon: <CreditCard className="size-4" /> },
      ],
    },
  ];

  return (
    <AppShell
      subtitle="Customer portal"
      roleLabel="Customer"
      homeHref="/dashboard"
      user={user}
      groups={groups}
      topBarStart={<CatalogueSearch />}
      topBarEnd={
        <>
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
        </>
      }
    >
      {children}
    </AppShell>
  );
}
