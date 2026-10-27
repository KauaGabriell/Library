import type { ReactNode } from "react";

type BookDetailsCardProps = {
  children: ReactNode;
  className?: string;
};

export function BookDetailsCard({
  children,
  className = "",
}: BookDetailsCardProps) {
  return (
    <section
      className={`rounded-card border border-border-default/50 bg-background-canvas p-5 sm:p-6 ${className}`}
    >
      {children}
    </section>
  );
}
