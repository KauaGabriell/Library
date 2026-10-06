import type React from "react";
import { tv, type VariantProps } from "tailwind-variants";

const buttonVariants = tv({
  base: "relative inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition-colors motion-reduce:transition-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-60",
  variants: {
    variant: {
      primary:
        "bg-[var(--color-brand-primary)] text-[var(--color-background-canvas)] enabled:hover:bg-[var(--color-brand-primary-hover)]",
      secondary:
        "border border-[var(--color-border-default)] bg-[var(--color-background-surface)] text-[var(--color-text-primary)] enabled:hover:border-[var(--color-brand-primary)]",
      ghost:
        "bg-transparent text-[var(--color-brand-primary)] enabled:hover:bg-[var(--color-background-surface)]",
      destructive:
        "bg-[var(--color-feedback-error)] text-[var(--color-background-canvas)] enabled:hover:bg-[color-mix(in_srgb,var(--color-feedback-error)_88%,var(--color-text-primary))]",
    },
  },
  defaultVariants: {
    variant: "primary",
  },
});

type ButtonVariant = NonNullable<
  VariantProps<typeof buttonVariants>["variant"]
>;

type ButtonProps = React.ComponentProps<"button"> & {
  variant?: ButtonVariant;
  loading?: boolean;
};

export function Button({
  variant,
  loading,
  children,
  disabled,
  type = "button",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading}
      className={buttonVariants({ variant, className })}
    >
      <span
        className={`inline-flex items-center gap-2 ${loading ? "opacity-0" : ""}`}
      >
        {children}
      </span>
      {loading && (
        <span
          aria-hidden="true"
          className="absolute inset-0 inline-flex items-center justify-center"
        >
          <span className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none" />
        </span>
      )}
    </button>
  );
}
