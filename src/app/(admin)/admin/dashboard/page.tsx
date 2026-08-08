import type { Metadata } from "next";

import { requireRole } from "@/lib/auth/current-user";

export const metadata: Metadata = { title: "Operations dashboard" };

/** KPI tiles listed in the brief — wired to live queries in the next milestone. */
const KPIS = [
  "Active rentals",
  "Rentals due today",
  "Upcoming pickups",
  "Upcoming returns",
  "Overdue rentals",
  "Revenue from rentals",
  "Security deposits held",
  "Late fees collected",
];

export default async function AdminDashboardPage() {
  const user = await requireRole("ADMIN");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          Rental operations
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Signed in as {user.email}.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {KPIS.map((label) => (
          <div
            key={label}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <p className="text-sm text-ink-500">{label}</p>
            <p className="mt-1.5 text-2xl font-semibold tabular-nums text-slate-300">
              —
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
