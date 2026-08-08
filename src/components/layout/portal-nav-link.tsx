"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export function PortalNavLink({
  href,
  children,
  pill = false,
}: {
  href: string;
  children: React.ReactNode;
  pill?: boolean;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "whitespace-nowrap text-sm font-medium transition-colors",
        pill
          ? cn(
              "rounded-full px-3 py-1.5",
              active
                ? "bg-brand-600 text-white"
                : "text-ink-500 hover:bg-slate-100 hover:text-ink-900"
            )
          : active
            ? "text-ink-900"
            : "text-ink-500 hover:text-ink-900"
      )}
    >
      {children}
    </Link>
  );
}
