import { Suspense } from "react";
import type { Metadata } from "next";

import { AuthCardHeader } from "@/components/auth/auth-card-header";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your rental portal account.",
};

export default function LoginPage() {
  return (
    <div className="rounded-2xl bg-white p-7 shadow-sm ring-1 ring-slate-200 sm:p-8">
      <AuthCardHeader
        title="Welcome back"
        subtitle="Sign in to manage your rentals, pickups and returns."
      />
      {/* useSearchParams needs a Suspense boundary during prerender. */}
      <Suspense fallback={<div className="h-80" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
