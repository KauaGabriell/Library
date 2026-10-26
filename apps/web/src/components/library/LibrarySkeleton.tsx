const skeletonCards = [
  "book-a",
  "book-b",
  "book-c",
  "book-d",
  "book-e",
  "book-f",
];

export function LibrarySkeleton() {
  return (
    <div
      role="status"
      aria-label="Carregando biblioteca"
      className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3"
    >
      {skeletonCards.map((card) => (
        <div
          key={card}
          aria-hidden="true"
          className="flex min-h-52 animate-pulse gap-4 rounded-card border border-border-default/50 bg-background-surface p-5 motion-reduce:animate-none"
        >
          <div className="aspect-2/3 w-20 rounded-field bg-border-default/40" />
          <div className="flex flex-1 flex-col gap-3 py-1">
            <div className="h-5 w-4/5 rounded bg-border-default/40" />
            <div className="h-4 w-2/3 rounded bg-border-default/30" />
            <div className="mt-auto h-10 w-full rounded bg-border-default/30" />
          </div>
        </div>
      ))}
    </div>
  );
}
