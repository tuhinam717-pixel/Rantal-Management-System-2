import { AlertCircle, CheckCircle2, Info } from "lucide-react";

import { cn } from "@/lib/utils";

type Tone = "error" | "success" | "info";

const tones: Record<Tone, { wrapper: string; Icon: typeof Info }> = {
  error: {
    wrapper: "bg-red-50 text-red-800 ring-red-200",
    Icon: AlertCircle,
  },
  success: {
    wrapper: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    Icon: CheckCircle2,
  },
  info: {
    wrapper: "bg-brand-50 text-brand-800 ring-brand-200",
    Icon: Info,
  },
};

export function Alert({
  tone = "info",
  children,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  const { wrapper, Icon } = tones[tone];

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2.5 rounded-lg px-3.5 py-3 text-sm ring-1 ring-inset",
        wrapper,
        className
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </div>
  );
}
