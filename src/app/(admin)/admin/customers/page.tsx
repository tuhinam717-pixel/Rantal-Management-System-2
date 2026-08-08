import type { Metadata } from "next";
import { Mail, Phone, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  CardGrid,
  DataTable,
  EmptyState,
  TableRow,
} from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { ViewToggle } from "@/components/ui/view-toggle";
import { resolveView } from "@/lib/view-mode";
import { requireRole } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Customers" };

const COLUMNS = [
  { key: "customer", label: "Customer" },
  { key: "contact", label: "Contact" },
  { key: "rentals", label: "Rentals", align: "right" as const },
  { key: "ltv", label: "Lifetime value", align: "right" as const },
  { key: "joined", label: "Joined" },
  { key: "status", label: "Status" },
];

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  await requireRole("ADMIN");
  const view = resolveView((await searchParams).view);

  const customers = await prisma.user.findMany({
    where: { role: "CUSTOMER" },
    orderBy: { createdAt: "desc" },
    include: {
      orders: { select: { total: true, status: true } },
      _count: { select: { orders: true, addresses: true } },
    },
  });

  const stats = (c: (typeof customers)[number]) => ({
    lifetime: c.orders.reduce((sum, o) => sum + Number(o.total), 0),
    overdue: c.orders.filter((o) => o.status === "OVERDUE").length,
    initials: c.name
      .split(" ")
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase(),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description={`${customers.length} registered portal users`}
        actions={<ViewToggle current={view} />}
      />

      {customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No customers yet"
          description="Customers appear here once they register on the portal."
        />
      ) : view === "cards" ? (
        <CardGrid>
          {customers.map((customer) => {
            const { lifetime, overdue, initials } = stats(customer);

            return (
              <Card key={customer.id} hover className="p-5">
                <div className="flex items-start gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-200 text-sm font-semibold text-brand-800">
                    {initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink-900">
                      {customer.name}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-ink-500">
                      <Mail className="size-3.5 shrink-0" aria-hidden />
                      {customer.email}
                    </p>
                    {customer.phone && (
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-500">
                        <Phone className="size-3.5 shrink-0" aria-hidden />
                        {customer.phone}
                      </p>
                    )}
                  </div>
                  {!customer.isActive && <Badge tone="neutral">Inactive</Badge>}
                </div>

                <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3 text-center">
                  <div>
                    <dt className="text-xs text-ink-500">Rentals</dt>
                    <dd className="text-sm font-semibold text-ink-900">
                      {customer._count.orders}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-500">Lifetime</dt>
                    <dd className="text-sm font-semibold text-ink-900">
                      {formatCurrency(lifetime)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-500">Addresses</dt>
                    <dd className="text-sm font-semibold text-ink-900">
                      {customer._count.addresses}
                    </dd>
                  </div>
                </dl>

                {overdue > 0 && (
                  <div className="mt-3">
                    <Badge tone="danger">{overdue} overdue rental</Badge>
                  </div>
                )}
              </Card>
            );
          })}
        </CardGrid>
      ) : (
        <DataTable columns={COLUMNS}>
          {customers.map((customer) => {
            const { lifetime, overdue } = stats(customer);

            return (
              <TableRow key={customer.id}>
                <td className="px-4 py-3">
                  <p className="font-medium text-ink-900">{customer.name}</p>
                  <p className="text-xs text-ink-500">
                    {customer._count.addresses} saved address
                    {customer._count.addresses === 1 ? "" : "es"}
                  </p>
                </td>
                <td className="px-4 py-3 text-ink-700">
                  <p className="inline-flex items-center gap-1.5">
                    <Mail className="size-3.5 text-ink-400" aria-hidden />
                    {customer.email}
                  </p>
                  {customer.phone && (
                    <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-ink-500">
                      <Phone className="size-3.5" aria-hidden />
                      {customer.phone}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-ink-900">
                  {customer._count.orders}
                  {overdue > 0 && (
                    <span className="ml-1.5">
                      <Badge tone="danger">{overdue} overdue</Badge>
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-medium text-ink-900">
                  {formatCurrency(lifetime)}
                </td>
                <td className="px-4 py-3 text-ink-500">
                  {formatDate(customer.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={customer.isActive ? "success" : "neutral"}>
                    {customer.isActive ? "Active" : "Deactivated"}
                  </Badge>
                </td>
              </TableRow>
            );
          })}
        </DataTable>
      )}
    </div>
  );
}
