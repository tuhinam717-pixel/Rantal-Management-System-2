import type { Metadata } from "next";
import Link from "next/link";

import { AuthCardHeader } from "@/components/auth/auth-card-header";
import { Alert } from "@/components/ui/alert";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <div className="rounded-2xl bg-white p-7 shadow-sm ring-1 ring-slate-200 sm:p-8">
      <AuthCardHeader
        title="Reset your password"
        subtitle="We'll email you a link to set a new password."
      />

      <Alert tone="info">
        Password reset is not wired up yet — it needs an email provider. For now,
        ask an administrator to reset the account.
      </Alert>

      <p className="mt-6 text-center text-sm text-ink-500">
        <Link
          href="/login"
          className="font-medium text-brand-600 hover:text-brand-700"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
