"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

/**
 * Drawer that carries the portal sidebar below `lg`, where the rail is hidden.
 * The sidebar content is passed in as children so there is a single source of
 * truth for the nav rather than two lists that can drift apart.
 */
export function PortalMobileNav({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

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
            className="absolute inset-0 bg-ink-900/50"
          />

          <div className="relative flex h-dvh w-72 flex-col overflow-y-auto bg-ink-900">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close navigation"
              className="absolute right-3 top-3 grid size-8 place-items-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white"
            >
              <X className="size-4" aria-hidden />
            </button>

            {children}
          </div>
        </div>
      )}
    </div>
  );
}
