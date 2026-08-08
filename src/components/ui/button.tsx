import { forwardRef } from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "soft" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  // brand-600 rather than the mint itself: white text needs the contrast.
  primary:
    "bg-brand-600 text-white shadow-card hover:bg-brand-700 active:bg-brand-800 focus-visible:outline-brand-600",
  secondary:
    "bg-surface text-ink-900 ring-1 ring-inset ring-line shadow-card hover:bg-brand-50 hover:ring-brand-300 focus-visible:outline-brand-600",
  soft: "bg-brand-200 text-brand-800 hover:bg-brand-300 focus-visible:outline-brand-600",
  ghost: "text-ink-700 hover:bg-brand-50 hover:text-ink-900 focus-visible:outline-brand-600",
  danger:
    "bg-red-600 text-white shadow-card hover:bg-red-700 focus-visible:outline-red-600",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm gap-1.5",
  md: "h-11 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={cn(
        "inline-flex items-center justify-center rounded-xl font-medium",
        "transition-[background-color,box-shadow,transform] duration-150",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
        "active:translate-y-px",
        "disabled:pointer-events-none disabled:opacity-55",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {isLoading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
);

Button.displayName = "Button";
