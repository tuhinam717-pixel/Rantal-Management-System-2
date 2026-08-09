import type { Metadata } from "next";

import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { VendorProfileForm } from "@/components/vendor/vendor-profile-form";
import { requireVendor } from "@/lib/auth/current-user";

export const metadata: Metadata = { title: "Profile" };

export default async function VendorProfilePage() {
  const { user, vendor } = await requireVendor();

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Profile"
        description="Keep your contact details current — this is how the rental team reaches you about repairs and deliveries."
      />

      <Card className="p-5">
        <VendorProfileForm
          initial={{
            contactPerson: vendor.contactPerson ?? "",
            phone: vendor.phone ?? "",
            gstin: vendor.gstin ?? "",
            addressLine: vendor.addressLine ?? "",
            city: vendor.city ?? "",
            state: vendor.state ?? "",
            postalCode: vendor.postalCode ?? "",
          }}
        />
      </Card>

      <Card className="space-y-3 p-5">
        <h2 className="text-sm font-semibold text-ink-900">
          Set by the rental business
        </h2>
        <p className="text-sm text-ink-500">
          These are commercial terms, so they are not editable here. Ask your
          contact at the rental company to change them.
        </p>

        <dl className="grid gap-3 border-t border-line pt-3 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-ink-500">Vendor name</dt>
            <dd className="text-sm font-medium text-ink-900">{vendor.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-500">Payment terms</dt>
            <dd className="text-sm font-medium text-ink-900">
              {vendor.paymentTermsDays} days
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-500">Sign-in email</dt>
            <dd className="truncate text-sm font-medium text-ink-900">
              {user.email}
            </dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}
