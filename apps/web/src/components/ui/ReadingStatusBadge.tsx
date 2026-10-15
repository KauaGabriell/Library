import type { ReadingState } from "@library/contracts";
import type { ComponentProps } from "react";
import { tv } from "tailwind-variants";

const readingStatusBadgeVariants = tv({
  base: "inline-flex items-center rounded-full border px-2 py-1",
  variants: {
    status: {
      WANT_TO_READ:
        "border-status-want-to-read-border bg-status-want-to-read text-status-want-to-read-foreground",
      READING:
        "border-status-reading-border bg-status-reading text-status-reading-foreground",
      READ: "border-status-read-border bg-status-read text-status-read-foreground",
    },
  },
});

const statusLabels: Record<ReadingState, string> = {
  WANT_TO_READ: "Quero ler",
  READING: "Lendo",
  READ: "Lido",
};

type ReadingStatusBadgeProps = Omit<ComponentProps<"span">, "children"> & {
  status: ReadingState;
};

export function ReadingStatusBadge({
  status,
  className,
  ...props
}: ReadingStatusBadgeProps) {
  return (
    <span
      {...props}
      className={readingStatusBadgeVariants({ status, className })}
    >
      <span className="font-interface text-label-caps uppercase">
        {statusLabels[status]}
      </span>
    </span>
  );
}
