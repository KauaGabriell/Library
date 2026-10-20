import type { ComponentProps } from "react";

type CardProps = ComponentProps<"div"> & {
  padding?: "default" | "compact";
};

export function Card({ padding = "default", className, ...props }: CardProps) {
  const paddingClass = padding === "compact" ? "p-3 md:p-4" : "p-4 md:p-6";

  return (
    <div
      {...props}
      className={`rounded-card border border-border-default bg-background-surface ${paddingClass} ${className ?? ""}`}
    />
  );
}
