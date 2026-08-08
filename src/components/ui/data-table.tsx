import { Inbox } from "lucide-react";

import { cn } from "@/lib/utils";

/** Table chrome shared by every admin list, including its scroll container. */
export function DataTable({
  columns,
  children,
  minWidth = "48rem",
}: {
  columns: { key: string; label: string; align?: "left" | "right" | "center" }[];
  children: React.ReactNode;
  minWidth?: string;
}) {
  return (
    <div className="scroll-shadow overflow-x-auto rounded-2xl border border-line bg-surface shadow-card">
      <table className="w-full text-sm" style={{ minWidth }}>
        <thead>
          <tr className="border-b border-line bg-brand-50/60 text-left text-xs font-medium uppercase tracking-wide text-ink-500">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  "px-4 py-3 whitespace-nowrap",
                  column.align === "right" && "text-right",
                  column.align === "center" && "text-center"
                )}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

export function TableRow({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn("transition-colors hover:bg-brand-50/50", className)}
      {...props}
    />
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon: Icon = Inbox,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-brand-300 bg-brand-50/40 px-6 py-14 text-center",
        className
      )}
    >
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-brand-200 text-brand-800">
        <Icon className="size-5" />
      </span>
      <p className="mt-4 text-sm font-medium text-ink-900">{title}</p>
      {description && (
        <p className="mx-auto mt-1 max-w-sm text-sm text-ink-500">
          {description}
        </p>
      )}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

/** Grid wrapper for the card view of any list. */
export function CardGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-4 sm:grid-cols-2 xl:grid-cols-3",
        className
      )}
    >
      {children}
    </div>
  );
}
