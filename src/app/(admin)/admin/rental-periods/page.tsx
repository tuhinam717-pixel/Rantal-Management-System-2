import type { Metadata } from "next";
import { CalendarRange } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, EmptyState, TableRow } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { DeleteButton } from "@/components/admin/delete-button";
import { NewRentalPeriodDialog } from "@/components/admin/new-rental-period-form";
import {
  deleteRentalPeriodAction,
  toggleRentalPeriodAction,
} from "@/app/(admin)/admin/config-actions";
import { requireRole } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Rental periods" };

const COLUMNS = [
  { key: "name", label: "Name" },
  { key: "block", label: "Block" },
  { key: "rates", label: "Rates", align: "right" as const },
  { key: "used", label: "Used by", align: "right" as const },
  { key: "status", label: "Status" },
  { key: "actions", label: "", align: "right" as const },
];

export default async function AdminRentalPeriodsPage() {
  await requireRole("ADMIN");

  const periods = await prisma.rentalPeriod.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { pricelistItems: true, orderLines: true } } },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rental periods"
        description="The blocks customers can rent for. Each product carries a rate per active period."
        actions={<NewRentalPeriodDialog />}
      />

      {periods.length === 0 ? (
        <EmptyState
          icon={CalendarRange}
          title="No rental periods yet"
          description="Add hourly, daily, weekly or monthly blocks so products can be priced."
          action={<NewRentalPeriodDialog />}
        />
      ) : (
        <DataTable columns={COLUMNS} minWidth="42rem">
          {periods.map((period) => (
            <TableRow
              key={period.id}
              className={cn(!period.isActive && "opacity-55")}
            >
              <td className="px-4 py-3 font-medium text-ink-900">
                {period.name}
              </td>
              <td className="px-4 py-3 text-ink-700">
                {period.duration} {period.unit.toLowerCase()}
                {period.duration === 1 ? "" : "s"}
              </td>
              <td className="px-4 py-3 text-right text-ink-500">
                {period._count.pricelistItems}
              </td>
              <td className="px-4 py-3 text-right text-ink-500">
                {period._count.orderLines} orders
              </td>
              <td className="px-4 py-3">
                <Badge tone={period.isActive ? "success" : "neutral"}>
                  {period.isActive ? "Active" : "Inactive"}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                  <form action={toggleRentalPeriodAction}>
                    <input type="hidden" name="id" value={period.id} />
                    <input
                      type="hidden"
                      name="isActive"
                      value={String(!period.isActive)}
                    />
                    <Button type="submit" variant="ghost" size="sm">
                      {period.isActive ? "Deactivate" : "Activate"}
                    </Button>
                  </form>

                  <form action={deleteRentalPeriodAction}>
                    <input type="hidden" name="id" value={period.id} />
                    <DeleteButton
                      label=""
                      confirmMessage={
                        period._count.orderLines > 0
                          ? `${period.name} is used by ${period._count.orderLines} order(s), so it will be deactivated instead of deleted. Continue?`
                          : `Delete "${period.name}" and its rates?`
                      }
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
