import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import {
  Building2,
  Mail,
  Pencil,
  Phone,
  Power,
  PowerOff,
  Wrench,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  CardGrid,
  DataTable,
  EmptyState,
  TableRow,
} from "@/components/ui/data-table";
import { DeleteButton } from "@/components/admin/delete-button";
import { ListToolbar } from "@/components/ui/list-toolbar";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { VendorDialog } from "@/components/admin/vendor-form";
import { ViewToggle } from "@/components/ui/view-toggle";
import { VendorLoginDialog } from "@/components/admin/vendor-login-form";
import {
  deleteVendorAction,
  revokeVendorLoginAction,
  setVendorActiveAction,
} from "./actions";
import { pageMeta, resolvePage } from "@/lib/pagination";
import { resolveSort, textSearch, type SortOption } from "@/lib/list-query";
import { resolveView } from "@/lib/view-mode";
import { requireRole } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Vendors" };

const SORTS: SortOption<Prisma.VendorOrderByWithRelationInput>[] = [
  { value: "name", label: "Name A–Z", orderBy: { name: "asc" } },
  { value: "name-desc", label: "Name Z–A", orderBy: { name: "desc" } },
  { value: "newest", label: "Newest first", orderBy: { createdAt: "desc" } },
  { value: "products", label: "Most products", orderBy: { products: { _count: "desc" } } },
  { value: "terms", label: "Longest payment terms", orderBy: { paymentTermsDays: "desc" } },
];

const COLUMNS = [
  { key: "vendor", label: "Vendor" },
  { key: "contact", label: "Contact" },
  { key: "location", label: "Location" },
  { key: "products", label: "Products", align: "right" as const },
  { key: "repairs", label: "Repairs", align: "right" as const },
  { key: "terms", label: "Terms", align: "right" as const },
  { key: "status", label: "Status" },
  { key: "login", label: "Login" },
  { key: "actions", label: "", align: "right" as const },
];

export default async function AdminVendorsPage({
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

  const search = textSearch(q, [
    "name",
    "contactPerson",
    "email",
    "phone",
    "city",
    "gstin",
  ]);

  const where: Prisma.VendorWhereInput = {
    ...(status === "active" ? { isActive: true } : {}),
    ...(status === "inactive" ? { isActive: false } : {}),
    ...(search ? { OR: search } : {}),
  };

  const [vendors, total] = await Promise.all([
    prisma.vendor.findMany({
      where,
      orderBy: activeSort.orderBy,
      skip: pageInfo.skip,
      take: pageInfo.take,
      include: {
        _count: { select: { products: true, repairJobs: true } },
        user: { select: { email: true } },
      },
    }),
    prisma.vendor.count({ where }),
  ]);

  const meta = pageMeta(pageInfo, total);
  const listParams = { view: rawView, q, sort, status };
  const filtered = Boolean(q || status);

  const initialOf = (vendor: (typeof vendors)[number]) => ({
    id: vendor.id,
    name: vendor.name,
    contactPerson: vendor.contactPerson ?? "",
    email: vendor.email ?? "",
    phone: vendor.phone ?? "",
    gstin: vendor.gstin ?? "",
    addressLine: vendor.addressLine ?? "",
    city: vendor.city ?? "",
    state: vendor.state ?? "",
    postalCode: vendor.postalCode ?? "",
    country: vendor.country,
    paymentTermsDays: vendor.paymentTermsDays,
    notes: vendor.notes ?? "",
  });

  const placeOf = (vendor: (typeof vendors)[number]) =>
    [vendor.city, vendor.state].filter(Boolean).join(", ") || "—";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendors"
        description="Suppliers you buy or lease rental stock from, and the workshops that repair it."
        actions={
          <>
            <ViewToggle current={view} />
            <VendorDialog />
          </>
        }
      />

      <ListToolbar
        basePath="/admin/vendors"
        params={listParams}
        searchPlaceholder="Search name, contact, city or GSTIN…"
        sortOptions={SORTS.map(({ value, label }) => ({ value, label }))}
        filters={[
          {
            key: "status",
            options: [
              { value: undefined, label: "All" },
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ],
          },
        ]}
      />

      {vendors.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={filtered ? "No vendors match" : "No vendors yet"}
          description={
            filtered
              ? "Try a different search term or status."
              : "Add the suppliers your rental stock comes from, then link products to them."
          }
          action={filtered ? undefined : <VendorDialog />}
        />
      ) : view === "cards" ? (
        <CardGrid>
          {vendors.map((vendor) => (
            <Card key={vendor.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink-900">
                    {vendor.name}
                  </p>
                  {vendor.contactPerson && (
                    <p className="truncate text-xs text-ink-500">
                      {vendor.contactPerson}
                    </p>
                  )}
                </div>
                <Badge tone={vendor.isActive ? "success" : "neutral"}>
                  {vendor.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>

              <div className="mt-3 space-y-1 text-xs text-ink-500">
                {vendor.email && (
                  <p className="flex items-center gap-1.5 truncate">
                    <Mail className="size-3.5 shrink-0" aria-hidden />
                    {vendor.email}
                  </p>
                )}
                {vendor.phone && (
                  <p className="flex items-center gap-1.5">
                    <Phone className="size-3.5 shrink-0" aria-hidden />
                    {vendor.phone}
                  </p>
                )}
                <p>{placeOf(vendor)}</p>
              </div>

              <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3 text-center">
                <div>
                  <dt className="text-xs text-ink-500">Products</dt>
                  <dd className="text-sm font-semibold tabular-nums text-ink-900">
                    {vendor._count.products}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-500">Repairs</dt>
                  <dd className="text-sm font-semibold tabular-nums text-ink-900">
                    {vendor._count.repairJobs}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-500">Terms</dt>
                  <dd className="text-sm font-semibold tabular-nums text-ink-900">
                    {vendor.paymentTermsDays}d
                  </dd>
                </div>
              </dl>

              <div className="mt-4 flex items-center gap-1 border-t border-line pt-3">
                <VendorDialog
                  initial={initialOf(vendor)}
                  trigger={
                    <Button variant="soft" size="sm" className="flex-1">
                      <Pencil className="size-4" aria-hidden />
                      Edit
                    </Button>
                  }
                />
                <form action={setVendorActiveAction}>
                  <input type="hidden" name="id" value={vendor.id} />
                  <input
                    type="hidden"
                    name="isActive"
                    value={vendor.isActive ? "false" : "true"}
                  />
                  <Button type="submit" variant="ghost" size="sm">
                    {vendor.isActive ? (
                      <PowerOff className="size-4" aria-hidden />
                    ) : (
                      <Power className="size-4" aria-hidden />
                    )}
                  </Button>
                </form>
              </div>
            </Card>
          ))}
        </CardGrid>
      ) : (
        <DataTable columns={COLUMNS} minWidth="66rem">
          {vendors.map((vendor) => (
            <TableRow key={vendor.id}>
              <td className="px-4 py-3">
                <p className="font-medium text-ink-900">{vendor.name}</p>
                {vendor.gstin && (
                  <p className="font-mono text-xs text-ink-500">
                    {vendor.gstin}
                  </p>
                )}
              </td>

              <td className="px-4 py-3 text-ink-700">
                {vendor.contactPerson && <p>{vendor.contactPerson}</p>}
                {vendor.email && (
                  <p className="truncate text-xs text-ink-500">
                    {vendor.email}
                  </p>
                )}
                {vendor.phone && (
                  <p className="text-xs text-ink-500">{vendor.phone}</p>
                )}
                {!vendor.contactPerson && !vendor.email && !vendor.phone && (
                  <span className="text-ink-400">—</span>
                )}
              </td>

              <td className="px-4 py-3 text-ink-500">{placeOf(vendor)}</td>

              <td className="px-4 py-3 text-right">
                {vendor._count.products > 0 ? (
                  <Link
                    href={`/admin/products?q=${encodeURIComponent(vendor.name)}`}
                    className="font-medium text-brand-700 hover:text-brand-800"
                  >
                    {vendor._count.products}
                  </Link>
                ) : (
                  <span className="text-ink-400">0</span>
                )}
              </td>

              <td className="px-4 py-3 text-right text-ink-900">
                <span className="inline-flex items-center gap-1 tabular-nums">
                  {vendor._count.repairJobs > 0 && (
                    <Wrench className="size-3.5 text-ink-400" aria-hidden />
                  )}
                  {vendor._count.repairJobs}
                </span>
              </td>

              <td className="px-4 py-3 text-right tabular-nums text-ink-700">
                {vendor.paymentTermsDays}d
              </td>

              <td className="px-4 py-3">
                <Badge tone={vendor.isActive ? "success" : "neutral"}>
                  {vendor.isActive ? "Active" : "Inactive"}
                </Badge>
              </td>

              <td className="px-4 py-3">
                {vendor.user ? (
                  <div className="space-y-1">
                    <Badge tone="brand">Can sign in</Badge>
                    <p className="truncate text-xs text-ink-500">
                      {vendor.user.email}
                    </p>
                  </div>
                ) : (
                  <span className="text-xs text-ink-400">No account</span>
                )}
              </td>

              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                  <VendorLoginDialog
                    vendorId={vendor.id}
                    vendorName={vendor.name}
                    defaultEmail={vendor.user?.email ?? vendor.email ?? ""}
                    hasLogin={Boolean(vendor.user)}
                  />

                  {vendor.user && (
                    <form action={revokeVendorLoginAction}>
                      <input type="hidden" name="vendorId" value={vendor.id} />
                      <Button type="submit" variant="ghost" size="sm">
                        Revoke
                      </Button>
                    </form>
                  )}

                  <VendorDialog
                    initial={initialOf(vendor)}
                    trigger={
                      <Button variant="soft" size="sm">
                        <Pencil className="size-4" aria-hidden />
                        Edit
                      </Button>
                    }
                  />

                  <form action={setVendorActiveAction}>
                    <input type="hidden" name="id" value={vendor.id} />
                    <input
                      type="hidden"
                      name="isActive"
                      value={vendor.isActive ? "false" : "true"}
                    />
                    <Button type="submit" variant="ghost" size="sm">
                      {vendor.isActive ? "Deactivate" : "Reactivate"}
                    </Button>
                  </form>

                  <form action={deleteVendorAction}>
                    <input type="hidden" name="id" value={vendor.id} />
                    <DeleteButton
                      label=""
                      confirmMessage={`Delete ${vendor.name}? Products and repairs keep their history, they just stop pointing at this vendor.`}
                    />
                  </form>
                </div>
              </td>
            </TableRow>
          ))}
        </DataTable>
      )}

      <Pagination
        meta={meta}
        basePath="/admin/vendors"
        params={listParams}
        label="vendors"
      />
    </div>
  );
}
