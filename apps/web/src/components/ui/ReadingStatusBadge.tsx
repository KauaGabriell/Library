import type { ReadingState } from "@library/contracts";
import type { ComponentProps } from "react";
import { Badge, type BadgeAppearance, BadgeDot } from "./Badge";

const statusVariants = {
  WANT_TO_READ: "neutral",
  READING: "info",
  READ: "success",
} as const;

const statusLabels: Record<ReadingState, string> = {
  WANT_TO_READ: "Quero ler",
  READING: "Lendo",
  READ: "Lido",
};

export function getReadingStatusLabel(status: ReadingState) {
  return statusLabels[status];
}

type ReadingStatusBadgeProps = Omit<ComponentProps<"span">, "children"> & {
  status: ReadingState;
  appearance?: BadgeAppearance;
};

export function ReadingStatusBadge({
  status,
  appearance = "light",
  className,
  ...props
}: ReadingStatusBadgeProps) {
  return (
    <Badge
      {...props}
      variant={statusVariants[status]}
      appearance={appearance}
      size="sm"
      shape="circle"
      className={className}
    >
      <BadgeDot />
      <span className="font-interface text-label-caps uppercase">
        {getReadingStatusLabel(status)}
      </span>
    </Badge>
  );
}
