"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

/**
 * `icon` is a rendered element, not a component: the parent is a server
 * component, and function references can't cross the RSC boundary.
 */
export function AdminNavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

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
      <span className="shrink-0" aria-hidden>
        {icon}
      </span>
      {children}
    </Link>
  );
}
