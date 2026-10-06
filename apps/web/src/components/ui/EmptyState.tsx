import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <section className="flex flex-col items-start gap-4">
      <div className="flex flex-col gap-2">
        <h2 className="font-heading text-heading-md">{title}</h2>
        <p className="max-w-prose text-body-md text-text-secondary">
          {description}
        </p>
      </div>
      {action}
    </section>
  );
}
