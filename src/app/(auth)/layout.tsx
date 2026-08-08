import Link from "next/link";
import {
  CalendarClock,
  ShieldCheck,
  TrendingUp,
  Truck,
} from "lucide-react";

import { Logo } from "@/components/ui/logo";
import { APP_NAME } from "@/lib/constants";

const highlights = [
  {
    Icon: TrendingUp,
    title: "One operations dashboard",
    body: "Active rentals, returns due today and overdue orders at a glance.",
  },
  {
    Icon: ShieldCheck,
    title: "Deposits under control",
    body: "Collect, hold and settle security deposits inside the rental flow.",
  },
  {
    Icon: CalendarClock,
    title: "Late fees on autopilot",
    body: "Overdue returns are detected and charged against the deposit automatically.",
  },
  {
    Icon: Truck,
    title: "Pickup & return planning",
    body: "Daily schedules, inspection checklists and instant stock updates.",
  },
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel — hidden on small screens so the form gets the room. */}
      <aside className="relative hidden overflow-hidden bg-brand-700 p-12 lg:flex lg:flex-col lg:justify-between">
        <div
          className="animate-aurora pointer-events-none absolute -left-24 -top-24 size-[32rem] rounded-full bg-brand-400/30 blur-3xl"
          aria-hidden
        />
        <div
          className="animate-aurora pointer-events-none absolute -bottom-32 -right-20 size-[28rem] rounded-full bg-indigo-400/25 blur-3xl"
          aria-hidden
        />

        <Link href="/" className="relative z-10 w-fit">
          <Logo inverted />
        </Link>

        <div className="relative z-10 max-w-md">
          <h1 className="text-3xl font-semibold leading-tight text-white">
            Run every rental from a single screen.
          </h1>
          <p className="mt-3 text-brand-100">
            {APP_NAME} keeps quotations, pickups, returns, deposits and penalties
            in one place — so nothing is tracked in a spreadsheet again.
          </p>

          <ul className="mt-10 space-y-5">
            {highlights.map(({ Icon, title, body }) => (
              <li key={title} className="flex gap-3.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/15 text-white">
                  <Icon className="size-4.5" aria-hidden />
                </span>
                <span>
                  <span className="block text-sm font-medium text-white">
                    {title}
                  </span>
                  <span className="block text-sm text-brand-100">{body}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-brand-200">
          © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
        </p>
      </aside>

      <main className="flex items-center justify-center bg-slate-50 px-5 py-12 sm:px-8">
        <div className="w-full max-w-md animate-fade-up">
          <Link href="/" className="mb-8 flex justify-center lg:hidden">
            <Logo />
          </Link>
          {children}
        </div>
      </main>
    </div>
  );
}
