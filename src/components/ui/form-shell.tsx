import { cn } from "@/lib/utils";

/**
 * A numbered form section: label column on the left, fields on the right.
 * Gives long create/edit forms a readable rhythm instead of one flat stack.
 */
export function FormSection({
  step,
  title,
  description,
  children,
  className,
}: {
  step?: number;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "grid gap-5 rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6 lg:grid-cols-[15rem_1fr] lg:gap-8",
        className
      )}
    >
      <div className="lg:pt-1">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-900">
          {step !== undefined && (
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-200 text-xs font-semibold text-brand-800">
              {step}
            </span>
          )}
          {title}
        </h2>
        {description && (
          <p className="mt-1.5 text-xs leading-relaxed text-ink-500 lg:pr-4">
            {description}
          </p>
        )}
      </div>

      <div className="space-y-5">{children}</div>
    </section>
  );
}

/**
 * Action bar pinned to the bottom of the viewport so Save is always reachable
 * on a long form.
 */
export function FormActions({
  children,
  note,
}: {
  children: React.ReactNode;
  note?: React.ReactNode;
}) {
  return (
    <div className="sticky bottom-0 z-20 -mx-1 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface/95 px-5 py-3.5 shadow-lift backdrop-blur">
      <div className="text-xs text-ink-500">{note}</div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

export function FieldRow({
  children,
  cols = 2,
}: {
  children: React.ReactNode;
  cols?: 2 | 3;
}) {
  return (
    <div
      className={cn(
        "grid gap-4",
        cols === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"
      )}
    >
      {children}
    </div>
  );
}
