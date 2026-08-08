"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Logo } from "@/components/ui/logo";

const AUTO_ADVANCE_MS = 2200;

/**
 * Splash screen from the brief: shown briefly on entry, then hands off to
 * authentication. `href` is the login screen for guests and the role dashboard
 * for an already-signed-in user.
 */
export function SplashScreen({ href }: { href: string }) {
  const router = useRouter();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Let the bar paint at 0 before transitioning to 100.
    const paint = requestAnimationFrame(() => setProgress(100));
    const timer = setTimeout(() => router.replace(href), AUTO_ADVANCE_MS);

    return () => {
      cancelAnimationFrame(paint);
      clearTimeout(timer);
    };
  }, [href, router]);

  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden bg-brand-700 px-6">
      <div
        className="animate-aurora pointer-events-none absolute -left-32 -top-32 size-[36rem] rounded-full bg-brand-400/30 blur-3xl"
        aria-hidden
      />
      <div
        className="animate-aurora pointer-events-none absolute -bottom-40 -right-24 size-[32rem] rounded-full bg-indigo-400/25 blur-3xl"
        aria-hidden
      />

      <div className="relative z-10 flex animate-fade-up flex-col items-center text-center">
        <Logo inverted className="scale-125" />

        <h1 className="mt-8 max-w-lg text-balance text-2xl font-semibold text-white sm:text-3xl">
          Rental Management System
        </h1>
        <p className="mt-3 max-w-md text-sm text-brand-100">
          Quotations, pickups, returns, security deposits and late fees — one
          workflow, end to end.
        </p>

        <div
          className="mt-10 h-1 w-56 overflow-hidden rounded-full bg-white/20"
          role="progressbar"
          aria-label="Loading"
        >
          <div
            className="h-full rounded-full bg-white transition-[width] duration-[2000ms] ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <Link
          href={href}
          className="mt-6 text-xs font-medium text-brand-100 underline-offset-4 hover:text-white hover:underline"
        >
          Skip
        </Link>
      </div>
    </div>
  );
}
