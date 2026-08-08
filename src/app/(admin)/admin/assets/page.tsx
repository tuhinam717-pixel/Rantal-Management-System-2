import type { Metadata } from "next";
import Link from "next/link";
import {
  BatteryLow,
  MapPin,
  Pencil,
  Radio,
  SatelliteDish,
  TriangleAlert,
} from "lucide-react";

import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, EmptyState, TableRow } from "@/components/ui/data-table";
import { DeleteButton } from "@/components/admin/delete-button";
import { KpiTile } from "@/components/dashboard/kpi-tile";
import { PageHeader } from "@/components/ui/page-header";
import { TrackerDialog } from "@/components/admin/tracker-form";
import { deleteTrackerAction } from "./actions";
import { requireRole } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import {
  getTrackerSummary,
  listTrackers,
  OFFLINE_AFTER_MINUTES,
} from "@/server/services/assets";

export const metadata: Metadata = { title: "Asset tracking" };

const STATUS_TONE: Record<string, BadgeTone> = {
  IDLE: "neutral",
  OUT_ON_RENT: "brand",
  IN_TRANSIT: "info",
  MISSING: "danger",
};

const STATUS_LABEL: Record<string, string> = {
  IDLE: "In warehouse",
  OUT_ON_RENT: "Out on rent",
  IN_TRANSIT: "In transit",
  MISSING: "Missing",
};

const COLUMNS = [
  { key: "device", label: "Device" },
  { key: "product", label: "Product" },
  { key: "status", label: "Status" },
  { key: "battery", label: "Battery", align: "right" as const },
  { key: "position", label: "Last position" },
  { key: "seen", label: "Last seen" },
  { key: "actions", label: "", align: "right" as const },
];

/** Relative time, because "4 minutes ago" answers the question a date does not. */
function sinceLabel(date: Date | null, now: Date) {
  if (!date) return "Never";

  const minutes = Math.round((now.getTime() - date.getTime()) / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;

  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export default async function AdminAssetsPage() {
  await requireRole("ADMIN");
  const now = new Date();

  const [trackers, summary, products] = await Promise.all([
    listTrackers(now),
    getTrackerSummary(now),
    prisma.product.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, sku: true },
      take: 300,
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Asset tracking"
        description="Live position and battery for every tagged unit. Devices post to /api/iot/telemetry — any tag that can make an HTTPS request works."
        actions={<TrackerDialog products={products} />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Tagged units" value={summary.total} icon={Radio} />
        <KpiTile label="Out on rent" value={summary.outOnRent} icon={MapPin} />
        <KpiTile
          label={`Silent over ${Math.round(OFFLINE_AFTER_MINUTES / 60)}h`}
          value={summary.offline}
          icon={SatelliteDish}
          tone={summary.offline > 0 ? "warning" : "default"}
        />
        <KpiTile
          label="Reported missing"
          value={summary.missing}
          icon={TriangleAlert}
          tone={summary.missing > 0 ? "danger" : "default"}
        />
      </div>

      {trackers.length === 0 ? (
        <EmptyState
          icon={Radio}
          title="No trackers paired yet"
          description="Pair a tag to a product, then point the device at /api/iot/telemetry. Readings show up here as they arrive."
          action={<TrackerDialog products={products} />}
        />
      ) : (
        <DataTable columns={COLUMNS} minWidth="62rem">
          {trackers.map((tracker) => (
            <TableRow key={tracker.id}>
              <td className="px-4 py-3">
                <p className="font-mono text-sm font-medium text-ink-900">
                  {tracker.deviceId}
                </p>
                {tracker.label && (
                  <p className="text-xs text-ink-500">{tracker.label}</p>
                )}
              </td>

              <td className="px-4 py-3">
                <p className="text-ink-900">{tracker.product.name}</p>
                <p className="font-mono text-xs text-ink-500">
                  {tracker.product.sku}
                </p>
              </td>

              <td className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge tone={STATUS_TONE[tracker.status] ?? "neutral"}>
                    {STATUS_LABEL[tracker.status] ?? tracker.status}
                  </Badge>
                  {tracker.offline && <Badge tone="warning">Offline</Badge>}
                </div>
                {tracker.order && (
                  <Link
                    href={`/admin/orders/${tracker.order.id}`}
                    className="text-xs text-brand-700 hover:text-brand-800"
                  >
                    {tracker.order.number}
                  </Link>
                )}
              </td>

              <td className="px-4 py-3 text-right">
                {tracker.batteryPct == null ? (
                  <span className="text-ink-400">—</span>
                ) : (
                  <span
                    className={
                      tracker.lowBattery
                        ? "inline-flex items-center gap-1 font-medium tabular-nums text-red-600"
                        : "tabular-nums text-ink-900"
                    }
                  >
                    {tracker.lowBattery && (
                      <BatteryLow className="size-4" aria-hidden />
                    )}
                    {tracker.batteryPct}%
                  </span>
                )}
              </td>

              <td className="px-4 py-3">
                {tracker.latitude == null || tracker.longitude == null ? (
                  <span className="text-ink-400">No fix yet</span>
                ) : (
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${tracker.latitude}&mlon=${tracker.longitude}#map=16/${tracker.latitude}/${tracker.longitude}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="font-mono text-xs text-brand-700 hover:text-brand-800"
                  >
                    {tracker.latitude.toFixed(4)}, {tracker.longitude.toFixed(4)}
                  </a>
                )}
              </td>

              <td className="px-4 py-3 text-ink-500">
                {sinceLabel(tracker.lastSeenAt, now)}
              </td>

              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                  <TrackerDialog
                    products={products}
                    initial={{
                      id: tracker.id,
                      deviceId: tracker.deviceId,
                      label: tracker.label ?? "",
                      productId: tracker.productId,
                      status: tracker.status,
                    }}
                    trigger={
                      <Button variant="soft" size="sm">
                        <Pencil className="size-4" aria-hidden />
                        Edit
                      </Button>
                    }
                  />
                  <form action={deleteTrackerAction}>
                    <input type="hidden" name="id" value={tracker.id} />
                    <DeleteButton
                      label=""
                      confirmMessage={`Unpair ${tracker.deviceId}? Its history is deleted too.`}
                    />
                  </form>
                </div>
              </td>
            </TableRow>
          ))}
        </DataTable>
      )}
    </div>
  );
}
