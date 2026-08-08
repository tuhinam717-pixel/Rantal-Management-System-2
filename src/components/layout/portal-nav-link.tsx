"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

/**
 * Sidebar row for the customer portal.
 *
 * `/orders` must not light up while you are on `/orders/abc`'s sibling routes
 * only by prefix accident, so the match is exact-or-child-path.
 */
export function PortalNavLink({
  href,
  icon,
  badge,
  children,
  onNavigate,
}: {
  href: string;
  icon?: React.ReactNode;
  badge?: number;
  children: React.ReactNode;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
        active
          ? "bg-brand-50 font-medium text-brand-700"
          : "text-ink-600 hover:bg-slate-100 hover:text-ink-900"
      )}
    >
      {icon && (
        <span className={cn("shrink-0", active ? "text-brand-600" : "text-ink-400")}>
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {badge !== undefined && badge > 0 && (
        <span
          className={cn(
            "grid min-w-5 shrink-0 place-items-center rounded-full px-1.5 text-xs font-semibold",
            active ? "bg-brand-600 text-white" : "bg-slate-200 text-ink-700"
          )}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}
