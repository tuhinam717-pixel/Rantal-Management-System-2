"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Lock, Mail, ShieldCheck, UserRound } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEMO_ACCOUNTS } from "@/lib/constants";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";

const DEMO_ICONS = {
  ADMIN: ShieldCheck,
  CUSTOMER: UserRound,
  VENDOR: Building2,
} as const;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formError, setFormError] = useState<string | null>(null);

  const [demoPending, setDemoPending] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  /** Fills the form so the values are visible, then signs straight in. */
  async function signInAsDemo(account: (typeof DEMO_ACCOUNTS)[number]) {
    setValue("email", account.email);
    setValue("password", account.password);
    setDemoPending(account.role);
    await onSubmit({ email: account.email, password: account.password });
    setDemoPending(null);
  }

  async function onSubmit(values: LoginInput) {
    setFormError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.fieldErrors) {
          for (const [field, messages] of Object.entries(
            data.fieldErrors as Record<string, string[]>
          )) {
            setError(field as keyof LoginInput, { message: messages[0] });
          }
        }
        setFormError(data.error ?? "Could not sign you in.");
        return;
      }

      // `next` is set by middleware when it bounces an unauthenticated request.
      const next = searchParams.get("next");
      router.replace(next && next.startsWith("/") ? next : data.redirectTo);
      router.refresh();
    } catch {
      setFormError("Network error. Check your connection and try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {formError && <Alert tone="error">{formError}</Alert>}

      <Input
        label="Email address"
        type="email"
        autoComplete="email"
        placeholder="you@company.com"
        icon={<Mail className="size-4" />}
        error={errors.email?.message}
        {...register("email")}
      />

      <div className="space-y-1.5">
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          icon={<Lock className="size-4" />}
          error={errors.password?.message}
          {...register("password")}
        />
        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-brand-600 hover:text-brand-700"
          >
            Forgot password?
          </Link>
        </div>
      </div>

      <Button
        type="submit"
        size="lg"
        className="w-full"
        isLoading={isSubmitting && !demoPending}
      >
        {isSubmitting && !demoPending ? "Signing in…" : "Sign in"}
      </Button>

      {/* Only rendered when NEXT_PUBLIC_ENABLE_DEMO_LOGIN=true. */}
      {DEMO_ACCOUNTS.length > 0 && (
      <div className="rounded-xl bg-brand-50 p-4 ring-1 ring-inset ring-brand-200">
        <p className="text-xs font-medium text-ink-700">
          Demo accounts
          <span className="ml-1.5 font-normal text-ink-500">
            one click, no typing
          </span>
        </p>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {DEMO_ACCOUNTS.map((account) => {
            const Icon = DEMO_ICONS[account.role];
            return (
              <button
                key={account.role}
                type="button"
                onClick={() => signInAsDemo(account)}
                disabled={isSubmitting}
                className="flex items-start gap-2.5 rounded-xl bg-surface p-3 text-left ring-1 ring-inset ring-brand-200 transition-colors hover:bg-brand-100 hover:ring-brand-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Icon className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-ink-900">
                    {demoPending === account.role
                      ? "Signing in…"
                      : `Sign in as ${account.label}`}
                  </span>
                  <span className="block truncate text-xs text-ink-500">
                    {account.hint}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
      )}

      <p className="text-center text-sm text-ink-500">
        New to the portal?{" "}
        <Link
          href="/signup"
          className="font-medium text-brand-600 hover:text-brand-700"
        >
          Create an account
        </Link>
      </p>
    </form>
  );
}
