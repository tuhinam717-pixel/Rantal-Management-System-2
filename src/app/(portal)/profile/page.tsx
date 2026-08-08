import type { Metadata } from "next";
import Link from "next/link";
import { CreditCard, MapPin } from "lucide-react";

import { ProfileForm } from "@/components/profile/profile-form";
import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireUser();

  const [addressCount, orderCount] = await Promise.all([
    prisma.address.count({ where: { userId: user.id } }),
    prisma.rentalOrder.count({ where: { customerId: user.id } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          Profile
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Member since {formatDate(user.createdAt)} · {orderCount} rental
          {orderCount === 1 ? "" : "s"}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
          <ProfileForm
            initial={{
              name: user.name,
              email: user.email,
              phone: user.phone ?? "",
              imageUrl: user.imageUrl ?? "",
            }}
          />
        </section>

        <aside className="h-fit space-y-3">
          <Link
            href="/profile/addresses"
            className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-shadow hover:shadow-md"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
              <MapPin className="size-4" aria-hidden />
            </span>
            <span>
              <span className="block text-sm font-medium text-ink-900">
                Delivery addresses
              </span>
              <span className="block text-xs text-ink-500">
                {addressCount} saved
              </span>
            </span>
          </Link>

          <Link
            href="/profile/payment-methods"
            className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-shadow hover:shadow-md"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
              <CreditCard className="size-4" aria-hidden />
            </span>
            <span>
              <span className="block text-sm font-medium text-ink-900">
                Payment methods
              </span>
              <span className="block text-xs text-ink-500">
                Cards used at checkout
              </span>
            </span>
          </Link>
        </aside>
      </div>
    </div>
  );
}
