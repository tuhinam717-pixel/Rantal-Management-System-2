import Link from "next/link";
import { PackageCheck, UserRound } from "lucide-react";

import { AppImage } from "@/components/ui/app-image";
import { AppMobileNav } from "@/components/layout/app-mobile-nav";
import { AppNavLink } from "@/components/layout/app-nav-link";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { APP_NAME } from "@/lib/constants";

export interface ShellNavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

export interface ShellNavGroup {
  /** Omit on a single-group nav, where a heading would be noise. */
  label?: string;
  items: ShellNavItem[];
}

/**
 * The chrome every console shares: dark rail on the left, white utility bar
 * across the top, content in the middle.
 *
 * Admin, customer and vendor each render this with different nav groups and
 * top-bar slots. Keeping it in one place is the point — three hand-written
 * layouts had already drifted into three different sidebars.
 */
export function AppShell({
  subtitle,
  roleLabel,
  homeHref,
  user,
  groups,
  sidebarFooter,
  topBarStart,
  topBarEnd,
  children,
}: {
  /** Sits under the product name in the rail, e.g. "Vendor portal". */
  subtitle: string;
  /** Badge next to the name in the top bar, e.g. "Administrator". */
  roleLabel: string;
  homeHref: string;
  user: { name: string; email: string; imageUrl?: string | null };
  groups: ShellNavGroup[];
  sidebarFooter?: React.ReactNode;
  topBarStart?: React.ReactNode;
  topBarEnd?: React.ReactNode;
  children: React.ReactNode;
}) {
  const allHrefs = groups.flatMap((group) => group.items.map((i) => i.href));

  const avatar = (size: "sm" | "md") => (
    <span
      className={
        size === "md"
          ? "relative size-10 shrink-0 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/15"
          : "relative size-8 shrink-0 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200"
      }
    >
      {user.imageUrl ? (
        <AppImage
          src={user.imageUrl}
          alt=""
          fill
          sizes={size === "md" ? "40px" : "32px"}
          className="object-cover"
        />
      ) : (
        <span className="grid size-full place-items-center text-slate-400">
          <UserRound className={size === "md" ? "size-5" : "size-4"} aria-hidden />
        </span>
      )}
    </span>
  );

  // Rendered once, used by both the fixed rail and the mobile drawer.
  const nav = (
    <>
      <div className="flex h-16 items-center gap-2.5 border-b border-white/10 px-5">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-600 text-white">
          <PackageCheck className="size-4" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-white">
            {APP_NAME}
          </span>
          <span className="block text-xs text-slate-400">{subtitle}</span>
        </span>
      </div>

      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
        {avatar("md")}
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-white">
            {user.name}
          </span>
          <span className="block truncate text-xs text-slate-400">
            {user.email}
          </span>
        </span>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {groups.map((group, index) => (
          <div key={group.label ?? index}>
            {group.label && (
              <p className="px-2 pb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <AppNavLink
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  badge={item.badge}
                  siblings={allHrefs}
                >
                  {item.label}
                </AppNavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="space-y-2 border-t border-white/10 p-3">
        {sidebarFooter}
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
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <AppMobileNav>{nav}</AppMobileNav>

            <Link
              href={homeHref}
              className="text-sm font-semibold text-ink-900 lg:hidden"
            >
              {subtitle}
            </Link>

            {topBarStart}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {topBarEnd}

            <span className="ml-1 hidden items-center gap-2 rounded-lg py-1 pl-1 pr-2 lg:flex">
              {avatar("sm")}
              <span className="max-w-32 truncate text-sm font-medium text-ink-700">
                {user.name}
              </span>
              <span className="rounded-full bg-ink-900 px-2 py-0.5 text-xs font-medium text-white">
                {roleLabel}
              </span>
            </span>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
      </div>
    </div>
  );
}
