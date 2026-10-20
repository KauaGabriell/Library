import type { ComponentProps } from "react";

type SkeletonProps = Omit<ComponentProps<"div">, "children">;

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      {...props}
      aria-hidden="true"
      className={`motion-safe:animate-pulse motion-reduce:animate-none bg-background-subtle ${className ?? ""}`}
    />
  );
}
