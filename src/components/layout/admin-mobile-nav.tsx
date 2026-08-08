"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

import { cn } from "@/lib/utils";

export interface MobileNavGroup {
  label: string;
  items: { href: string; label: string }[];
}

/**
 * Drawer navigation for the admin console below `lg`, where the sidebar rail
 * is hidden. Without this there is no way to move between admin screens on a
 * phone.
 */
export function AdminMobileNav({ groups }: { groups: MobileNavGroup[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Route change closes the drawer; body scroll is locked while it's open.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        aria-expanded={open}
        className="grid size-9 place-items-center rounded-lg text-ink-700 hover:bg-slate-100"
      >
        <Menu className="size-5" aria-hidden />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink-900/60"
          />

          <nav className="relative flex h-dvh w-72 flex-col overflow-y-auto bg-ink-900 p-4">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-white">
                Admin console
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                className="grid size-8 place-items-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>

            <div className="space-y-5">
              {groups.map((group) => (
                <div key={group.label}>
                  <p className="px-2 pb-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
                    {group.label}
                  </p>
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const active =
                        pathname === item.href ||
                        pathname.startsWith(`${item.href}/`);

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "block rounded-lg px-3 py-2 text-sm transition-colors",
                            active
                              ? "bg-brand-600 font-medium text-white"
                              : "text-slate-300 hover:bg-white/5 hover:text-white"
                          )}
                        >
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <Link
              href="/dashboard"
              className="mt-6 block rounded-lg px-3 py-2 text-xs text-slate-400 hover:bg-white/5 hover:text-white"
            >
              View customer portal
            </Link>
          </nav>
        </div>
      )}
    </div>
  );
}
