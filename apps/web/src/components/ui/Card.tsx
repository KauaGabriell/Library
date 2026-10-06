import type { ComponentProps } from "react";

type CardProps = ComponentProps<"div">;

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      {...props}
      className={`rounded-card border border-border-default bg-background-surface p-4 md:p-6 ${className ?? ""}`}
    />
  );
}
