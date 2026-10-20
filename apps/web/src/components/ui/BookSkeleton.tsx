import { Skeleton } from "./Skeleton";

export function BookSkeleton() {
  return (
    <article
      aria-hidden="true"
      data-testid="book-skeleton"
      className="relative aspect-2/3 w-full max-w-56 overflow-hidden rounded-card border border-border-default bg-background-surface"
    >
      <Skeleton
        data-testid="book-skeleton-cover"
        className="absolute inset-0"
      />

      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-black/75 via-black/35 to-transparent" />

      <Skeleton className="absolute top-3 right-3 h-6 w-20 rounded-full opacity-90" />

      <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-1.5 p-4">
        <Skeleton className="h-5 w-4/5 rounded-sm" />
        <Skeleton className="h-3.5 w-3/5 rounded-sm" />
        <div className="mt-1 flex items-center gap-1.5">
          <Skeleton className="size-3.5 shrink-0 rounded-full" />
          <Skeleton className="h-3 w-2/5 rounded-sm" />
        </div>
      </div>
    </article>
  );
}
