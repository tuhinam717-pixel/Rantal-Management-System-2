import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { AddressBook } from "@/components/profile/address-book";
import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import type { AddressVM } from "@/types";

export const metadata: Metadata = { title: "Addresses" };

export default async function AddressesPage() {
  const user = await requireUser();

  const rows = await prisma.address.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });

  const addresses: AddressVM[] = rows.map((a) => ({
    id: a.id,
    label: a.label ?? undefined,
    line1: a.line1,
    line2: a.line2 ?? undefined,
    city: a.city,
    state: a.state,
    postalCode: a.postalCode,
    country: a.country,
    isDefault: a.isDefault,
  }));

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link
          href="/profile"
          className="inline-flex items-center gap-1 text-sm font-medium text-ink-500 hover:text-ink-900"
        >
          <ChevronLeft className="size-4" aria-hidden />
          Profile
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink-900">
          Delivery addresses
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Your default address is pre-selected at checkout.
        </p>
      </div>

      <AddressBook addresses={addresses} />
    </div>
  );
}
