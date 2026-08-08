import Link from "next/link";

import { Logo } from "@/components/ui/logo";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { requireUser } from "@/lib/auth/current-user";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/products", label: "Browse" },
  { href: "/orders", label: "My rentals" },
  { href: "/cart", label: "Cart" },
  { href: "/profile", label: "Profile" },
];

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-5">
          <Link href="/dashboard">
            <Logo />
          </Link>

          <nav className="hidden gap-6 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-ink-500 transition-colors hover:text-ink-900"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-ink-500 sm:inline">
              {user.name}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
    </div>
  );
}
