import type { Metadata } from "next";

import { PageHeader } from "@/components/ui/page-header";
import { ScanStation } from "@/components/scan/scan-station";
import { requireRole } from "@/lib/auth/current-user";

export const metadata: Metadata = { title: "Scan" };

export default async function AdminScanPage() {
  await requireRole("ADMIN");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scan station"
        description="Scan a rental order at handover or return. The right action is offered automatically, with the late-fee preview already calculated."
      />

      <ScanStation />
    </div>
  );
}
