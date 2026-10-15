import type React from "react";
import { tv, type VariantProps } from "tailwind-variants";

const textVariants = tv({
  base: "text-text-primary",
  variants: {
    variant: {
      displayLg: "font-heading text-display",
      headlineMd: "font-heading text-heading-lg",
      headlineSm: "font-heading text-heading-md",
      headingLarge: "font-heading text-heading-large",
      bodyLg: "font-interface text-body-lg",
      bodyMd: "font-interface text-body-md",
      metadata: "font-interface text-metadata",
      labelCaps: "font-interface text-label-caps uppercase",
    },
    tone: {
      primary: "text-text-primary",
      secondary: "text-text-secondary",
      muted: "text-text-muted",
    },
  },
  defaultVariants: {
    variant: "bodyMd",
    tone: "primary",
  },
});

type TextProps = React.ComponentProps<"span"> &
  VariantProps<typeof textVariants>;

export function Text({ variant, tone, className, ...props }: TextProps) {
  return (
    <span className={textVariants({ variant, tone, className })} {...props} />
  );
}
