import type { Metadata } from "next";

import { SettingsForm } from "@/components/admin/settings-form";
import { requireRole } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  await requireRole("ADMIN");

  const settings = await prisma.orgSettings.findUnique({
    where: { id: "default" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          Settings
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Organisation-wide rental configuration.
        </p>
      </div>

      <SettingsForm
        initial={{
          companyName: settings?.companyName ?? "RentFlow Rentals",
          currency: settings?.currency ?? "INR",
          defaultDepositType: settings?.defaultDepositType ?? "FIXED",
          defaultDepositValue: Number(settings?.defaultDepositValue ?? 0),
          defaultGraceHours: settings?.defaultGraceHours ?? 0,
          quotationValidDays: settings?.quotationValidDays ?? 7,
        }}
      />
    </div>
  );
}
