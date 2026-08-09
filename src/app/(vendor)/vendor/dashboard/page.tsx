import type { Metadata } from "next";
import Link from "next/link";
import { Boxes, PackageCheck, TriangleAlert, Wrench } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { KpiTile } from "@/components/dashboard/kpi-tile";
import { PageHeader } from "@/components/ui/page-header";
import { requireVendor } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Vendor dashboard" };

export default async function VendorDashboardPage() {
  const { vendor } = await requireVendor();

  // Every query is pinned to this vendor's id — that is the isolation.
  const [products, openRepairs, stock, recentRepairs] = await Promise.all([
    prisma.product.count({ where: { vendorId: vendor.id } }),
    prisma.repairJob.count({
      where: { vendorId: vendor.id, status: { in: ["PENDING", "IN_PROGRESS"] } },
    }),
    prisma.product.aggregate({
      where: { vendorId: vendor.id },
      _sum: { totalStock: true, reservedStock: true, underRepairStock: true },
    }),
    prisma.repairJob.findMany({
      where: { vendorId: vendor.id },
      orderBy: { openedAt: "desc" },
      take: 5,
      include: { product: { select: { name: true, sku: true } } },
    }),
  ]);

  const totalStock = stock._sum.totalStock ?? 0;
  const onRent = stock._sum.reservedStock ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Hello, ${vendor.name}`}
        description="Your stock with this rental business, and the repair jobs sent to you."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Products supplied" value={products} icon={Boxes} />
        <KpiTile label="Units total" value={totalStock} icon={PackageCheck} />
        <KpiTile label="Units out on rent" value={onRent} icon={PackageCheck} tone="success" />
        <KpiTile
          label="Open repair jobs"
          value={openRepairs}
          icon={Wrench}
          tone={openRepairs > 0 ? "warning" : "default"}
        />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-ink-900">Latest repair jobs</h2>
          <Link
            href="/vendor/repairs"
            className="text-sm font-medium text-brand-700 hover:text-brand-800"
          >
            View all
          </Link>
        </div>

        {recentRepairs.length === 0 ? (
          <p className="mt-3 text-sm text-ink-500">
            Nothing has been sent to you for repair.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {recentRepairs.map((job) => (
              <li
                key={job.id}
                className="flex items-start justify-between gap-3 border-b border-line pb-3 last:border-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink-900">
                    {job.product.name}
                  </p>
                  <p className="truncate text-xs text-ink-500">{job.issue}</p>
                  <p className="text-xs text-ink-500">
                    Opened {formatDate(job.openedAt)} · {job.quantity} unit
                    {job.quantity === 1 ? "" : "s"}
                  </p>
                </div>
                <Badge
                  tone={
                    job.status === "COMPLETED"
                      ? "success"
                      : job.status === "WRITTEN_OFF"
                        ? "danger"
                        : "warning"
                  }
                >
                  {job.status.replace(/_/g, " ").toLowerCase()}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>

      {openRepairs > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <TriangleAlert className="size-5 shrink-0 text-amber-700" aria-hidden />
          <p className="text-sm text-amber-900">
            {openRepairs} job{openRepairs === 1 ? "" : "s"} still open. Progress
            is recorded by the rental team once you hand the units back.
          </p>
        </div>
      )}
    </div>
  );
}
