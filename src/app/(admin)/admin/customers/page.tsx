import type { Metadata } from "next";
import { Mail, Pencil, Phone, UserCheck, UserX, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  CardGrid,
  DataTable,
  EmptyState,
  TableRow,
} from "@/components/ui/data-table";
import { CustomerDialog } from "@/components/admin/customer-form";
import { ListToolbar } from "@/components/ui/list-toolbar";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { ViewToggle } from "@/components/ui/view-toggle";
import { pageMeta, resolvePage } from "@/lib/pagination";
import { resolveSort, textSearch, type SortOption } from "@/lib/list-query";
import { resolveView } from "@/lib/view-mode";
import { requireRole } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { setCustomerActiveAction } from "./actions";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

export const metadata: Metadata = { title: "Customers" };

const SORTS: SortOption<Prisma.UserOrderByWithRelationInput>[] = [
  { value: "newest", label: "Newest first", orderBy: { createdAt: "desc" } },
  { value: "oldest", label: "Oldest first", orderBy: { createdAt: "asc" } },
  { value: "name", label: "Name A–Z", orderBy: { name: "asc" } },
  { value: "name-desc", label: "Name Z–A", orderBy: { name: "desc" } },
  { value: "rentals", label: "Most rentals", orderBy: { orders: { _count: "desc" } } },
];

const COLUMNS = [
  { key: "customer", label: "Customer" },
  { key: "contact", label: "Contact" },
  { key: "rentals", label: "Rentals", align: "right" as const },
  { key: "ltv", label: "Lifetime value", align: "right" as const },
  { key: "joined", label: "Joined" },
  { key: "status", label: "Status" },
  { key: "actions", label: "", align: "right" as const },
];

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string;
    page?: string;
    q?: string;
    sort?: string;
    status?: string;
  }>;
}) {
  await requireRole("ADMIN");
  const { view: rawView, page, q, sort, status } = await searchParams;
  const view = resolveView(rawView);
  const pageInfo = resolvePage(page);
  const activeSort = resolveSort(sort, SORTS);

  const search = textSearch(q, ["name", "email", "phone"]);

  const where: Prisma.UserWhereInput = {
    role: "CUSTOMER",
    ...(status === "active" ? { isActive: true } : {}),
    ...(status === "inactive" ? { isActive: false } : {}),
    ...(search ? { OR: search } : {}),
  };

  const [customers, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: activeSort.orderBy,
      skip: pageInfo.skip,
      take: pageInfo.take,
      include: {
        orders: { select: { total: true, status: true } },
        _count: { select: { orders: true, addresses: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const meta = pageMeta(pageInfo, total);
  const listParams = { view: rawView, q, sort, status };

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
        description={`${total} registered portal users`}
        actions={
          <>
            <ViewToggle current={view} />
            <CustomerDialog />
          </>
        }
      />

      <ListToolbar
        basePath="/admin/customers"
        params={listParams}
        searchPlaceholder="Search name, email or phone…"
        sortOptions={SORTS.map(({ value, label }) => ({ value, label }))}
        filters={[
          {
            key: "status",
            options: [
              { value: undefined, label: "All" },
              { value: "active", label: "Active" },
              { value: "inactive", label: "Deactivated" },
            ],
          },
        ]}
      />

      {customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title={q || status ? "No customers match" : "No customers yet"}
          description={
            q || status
              ? "Try a different search term or filter."
              : "Customers appear here once they register on the portal."
          }
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

                <div className="mt-4 flex items-center gap-1 border-t border-line pt-3">
                  <CustomerDialog
                    initial={{
                      id: customer.id,
                      name: customer.name,
                      email: customer.email,
                      phone: customer.phone ?? "",
                      imageUrl: customer.imageUrl ?? "",
                    }}
                    trigger={
                      <Button variant="soft" size="sm" className="flex-1">
                        <Pencil className="size-4" aria-hidden />
                        Edit
                      </Button>
                    }
                  />
                  <form action={setCustomerActiveAction}>
                    <input type="hidden" name="id" value={customer.id} />
                    <input
                      type="hidden"
                      name="isActive"
                      value={customer.isActive ? "false" : "true"}
                    />
                    <Button type="submit" variant="ghost" size="sm">
                      {customer.isActive ? (
                        <UserX className="size-4" aria-hidden />
                      ) : (
                        <UserCheck className="size-4" aria-hidden />
                      )}
                    </Button>
                  </form>
                </div>
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
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <CustomerDialog
                      initial={{
                        id: customer.id,
                        name: customer.name,
                        email: customer.email,
                        phone: customer.phone ?? "",
                        imageUrl: customer.imageUrl ?? "",
                      }}
                      trigger={
                        <Button variant="soft" size="sm">
                          <Pencil className="size-4" aria-hidden />
                          Edit
                        </Button>
                      }
                    />
                    <form action={setCustomerActiveAction}>
                      <input type="hidden" name="id" value={customer.id} />
                      <input
                        type="hidden"
                        name="isActive"
                        value={customer.isActive ? "false" : "true"}
                      />
                      <Button type="submit" variant="ghost" size="sm">
                        {customer.isActive ? (
                          <>
                            <UserX className="size-4" aria-hidden />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <UserCheck className="size-4" aria-hidden />
                            Reactivate
                          </>
                        )}
                      </Button>
                    </form>
                  </div>
                </td>
              </TableRow>
            );
          })}
        </DataTable>
      )}

      <Pagination
        meta={meta}
        basePath="/admin/customers"
        params={listParams}
        label="customers"
      />
    </div>
  );
}
