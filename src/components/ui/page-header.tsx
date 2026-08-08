import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  back,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {back && (
        <Link
          href={back.href}
          className="inline-flex items-center gap-1 text-sm font-medium text-ink-500 transition-colors hover:text-ink-900"
        >
          <ChevronLeft className="size-4" aria-hidden />
          {back.label}
        </Link>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
            {title}
          </h1>
          {description && (
            <div className="mt-1 text-sm text-ink-500">{description}</div>
          )}
        </div>

        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
