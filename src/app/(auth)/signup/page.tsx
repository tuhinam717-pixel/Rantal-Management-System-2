import type { Metadata } from "next";

import { AuthCardHeader } from "@/components/auth/auth-card-header";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = {
  title: "Create account",
  description: "Register for the rental portal.",
};

export default function SignupPage() {
  return (
    <div className="rounded-2xl bg-white p-7 shadow-sm ring-1 ring-slate-200 sm:p-8">
      <AuthCardHeader
        title="Create your account"
        subtitle="Browse the catalogue, rent in a few clicks and track every order."
      />
      <SignupForm />
    </div>
  );
}
