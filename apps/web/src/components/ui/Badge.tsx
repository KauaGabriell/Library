import type { ComponentProps } from "react";
import { tv, type VariantProps } from "tailwind-variants";

const badgeVariants = tv({
  base: "inline-flex w-fit items-center justify-center gap-1.5 border font-interface font-semibold leading-none [&_svg]:shrink-0",
  variants: {
    variant: {
      primary: "border-transparent bg-brand-primary text-background-canvas",
      secondary:
        "border-border-default bg-background-subtle text-text-secondary",
      neutral:
        "border-status-want-to-read-border bg-status-want-to-read text-status-want-to-read-foreground",
      success:
        "border-status-read-foreground bg-status-read-foreground text-background-canvas",
      warning:
        "border-feedback-warning bg-feedback-warning text-background-canvas",
      info: "border-status-reading-foreground bg-status-reading-foreground text-background-canvas",
      destructive:
        "border-feedback-error bg-feedback-error text-background-canvas",
    },
    appearance: {
      default: "",
      light: "",
      outline: "bg-transparent",
      ghost: "border-transparent bg-transparent",
    },
    size: {
      lg: "h-7 min-w-7 rounded-md px-2 text-xs [&_svg]:size-3.5",
      md: "h-6 min-w-6 rounded-md px-[0.45rem] text-xs [&_svg]:size-3.5",
      sm: "h-5 min-w-5 rounded-sm px-[0.325rem] text-[0.6875rem] leading-3 [&_svg]:size-3",
      xs: "h-4 min-w-4 rounded-sm px-1 text-[0.625rem] leading-2 [&_svg]:size-3",
    },
    shape: {
      default: "",
      circle: "rounded-full",
    },
  },
  compoundVariants: [
    {
      variant: "primary",
      appearance: "light",
      class: "border-brand-primary/25 bg-brand-primary/10 text-brand-primary",
    },
    {
      variant: "secondary",
      appearance: "light",
      class: "border-border-default bg-background-subtle text-text-secondary",
    },
    {
      variant: "neutral",
      appearance: "light",
      class:
        "border-status-want-to-read-border bg-status-want-to-read-border/20 text-status-want-to-read-foreground",
    },
    {
      variant: "success",
      appearance: "light",
      class:
        "border-status-read-border bg-status-read-border/20 text-status-read-foreground",
    },
    {
      variant: "warning",
      appearance: "light",
      class:
        "border-feedback-warning/25 bg-feedback-warning/10 text-feedback-warning",
    },
    {
      variant: "info",
      appearance: "light",
      class:
        "border-status-reading-border bg-status-reading-border/20 text-status-reading-foreground",
    },
    {
      variant: "destructive",
      appearance: "light",
      class:
        "border-feedback-error/25 bg-feedback-error/10 text-feedback-error",
    },
    {
      variant: "primary",
      appearance: "outline",
      class: "border-brand-primary text-brand-primary",
    },
    {
      variant: "secondary",
      appearance: "outline",
      class: "border-border-control text-text-secondary",
    },
    {
      variant: "neutral",
      appearance: "outline",
      class:
        "border-status-want-to-read-border text-status-want-to-read-foreground",
    },
    {
      variant: "success",
      appearance: "outline",
      class: "border-status-read-border text-status-read-foreground",
    },
    {
      variant: "warning",
      appearance: "outline",
      class: "border-feedback-warning text-feedback-warning",
    },
    {
      variant: "info",
      appearance: "outline",
      class: "border-status-reading-border text-status-reading-foreground",
    },
    {
      variant: "destructive",
      appearance: "outline",
      class: "border-feedback-error text-feedback-error",
    },
    { variant: "primary", appearance: "ghost", class: "text-brand-primary" },
    { variant: "secondary", appearance: "ghost", class: "text-text-secondary" },
    {
      variant: "neutral",
      appearance: "ghost",
      class: "text-status-want-to-read-foreground",
    },
    {
      variant: "success",
      appearance: "ghost",
      class: "text-status-read-foreground",
    },
    { variant: "warning", appearance: "ghost", class: "text-feedback-warning" },
    {
      variant: "info",
      appearance: "ghost",
      class: "text-status-reading-foreground",
    },
    {
      variant: "destructive",
      appearance: "ghost",
      class: "text-feedback-error",
    },
  ],
  defaultVariants: {
    variant: "secondary",
    appearance: "default",
    size: "md",
    shape: "default",
  },
});

type BadgeProps = ComponentProps<"span"> & VariantProps<typeof badgeVariants>;
export type BadgeAppearance = NonNullable<BadgeProps["appearance"]>;

export function Badge({
  variant,
  appearance,
  size,
  shape,
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={badgeVariants({ variant, appearance, size, shape, className })}
      {...props}
    />
  );
}

export function BadgeDot({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      data-slot="badge-dot"
      aria-hidden="true"
      className={`size-1.5 shrink-0 rounded-full bg-current opacity-75 ${className ?? ""}`}
      {...props}
    />
  );
}
