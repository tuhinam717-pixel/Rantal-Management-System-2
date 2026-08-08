"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock, Mail, Phone, User } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordStrength } from "@/components/auth/password-strength";
import { signupSchema, type SignupInput } from "@/lib/validations/auth";

export function SignupForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });

  const password = watch("password") ?? "";

  async function onSubmit(values: SignupInput) {
    setFormError(null);

    try {
      const res = await fetch("/api/auth/signup", {
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
            setError(field as keyof SignupInput, { message: messages[0] });
          }
        }
        setFormError(data.error ?? "Could not create your account.");
        return;
      }

      router.replace(data.redirectTo);
      router.refresh();
    } catch {
      setFormError("Network error. Check your connection and try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {formError && <Alert tone="error">{formError}</Alert>}

      <Input
        label="Full name"
        autoComplete="name"
        placeholder="Faizan Alam"
        icon={<User className="size-4" />}
        error={errors.name?.message}
        {...register("name")}
      />

      <Input
        label="Email address"
        type="email"
        autoComplete="email"
        placeholder="you@company.com"
        icon={<Mail className="size-4" />}
        error={errors.email?.message}
        {...register("email")}
      />

      <Input
        label="Phone number"
        type="tel"
        autoComplete="tel"
        placeholder="+91 98765 43210"
        icon={<Phone className="size-4" />}
        hint="Optional — used for pickup and return reminders."
        error={errors.phone?.message}
        {...register("phone")}
      />

      <div className="space-y-2">
        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          icon={<Lock className="size-4" />}
          error={errors.password?.message}
          {...register("password")}
        />
        {!errors.password && <PasswordStrength value={password} />}
      </div>

      <Input
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        placeholder="••••••••"
        icon={<Lock className="size-4" />}
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />

      <div>
        <label className="flex items-start gap-2.5 text-sm text-ink-700">
          <input
            type="checkbox"
            className="mt-0.5 size-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600"
            {...register("acceptTerms")}
          />
          <span>
            I agree to the{" "}
            <Link href="/terms" className="font-medium text-brand-600 hover:text-brand-700">
              rental terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="font-medium text-brand-600 hover:text-brand-700">
              privacy policy
            </Link>
            .
          </span>
        </label>
        {errors.acceptTerms && (
          <p className="mt-1.5 text-xs text-red-600">
            {errors.acceptTerms.message}
          </p>
        )}
      </div>

      <Button type="submit" size="lg" className="w-full" isLoading={isSubmitting}>
        {isSubmitting ? "Creating account…" : "Create account"}
      </Button>

      <p className="text-center text-sm text-ink-500">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-brand-600 hover:text-brand-700"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
