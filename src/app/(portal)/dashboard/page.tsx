import type { Metadata } from "next";

import { requireUser } from "@/lib/auth/current-user";

export const metadata: Metadata = { title: "Dashboard" };

export default async function PortalDashboardPage() {
  const user = await requireUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          Hi {user.name.split(" ")[0]} 👋
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          You are signed in as a portal user. Your rentals, addresses and
          payment details live here.
        </p>
      </div>

      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <p className="text-sm text-ink-500">
          Catalogue, cart and checkout screens are the next milestone.
        </p>
      </div>
    </div>
  );
}
