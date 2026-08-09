"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

/**
 * One sidebar row, shared by the admin console, the customer portal and the
 * vendor portal so the three consoles cannot drift apart.
 *
 * `icon` is a rendered element, not a component: the parent is a server
 * component, and function references can't cross the RSC boundary.
 */
export function AppNavLink({
  href,
  icon,
  badge,
  children,
  siblings,
}: {
  href: string;
  icon?: React.ReactNode;
  badge?: number;
  children: React.ReactNode;
  /**
   * Every href in the nav. Prefix matching alone lights up two rows at once on
   * nested routes — on /profile/addresses both "Profile" and "Addresses"
   * match — so the most specific entry has to win.
   */
  siblings?: string[];
}) {
  const pathname = usePathname();

  const matches = (candidate: string) =>
    pathname === candidate || pathname.startsWith(`${candidate}/`);

  const bestMatch = (siblings ?? [href])
    .filter(matches)
    .sort((a, b) => b.length - a.length)[0];

  const active = bestMatch === href;

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
        active
          ? "bg-brand-600 font-medium text-white"
          : "text-slate-300 hover:bg-white/5 hover:text-white"
      )}
    >
      {icon && (
        <span className="shrink-0" aria-hidden>
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {badge !== undefined && badge > 0 && (
        <span
          className={cn(
            "grid min-w-5 shrink-0 place-items-center rounded-full px-1.5 text-xs font-semibold",
            active ? "bg-white/20 text-white" : "bg-white/10 text-slate-200"
          )}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}
