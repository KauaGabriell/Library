import type { LibraryEntryPublicResponse } from "@library/contracts";
import { LibraryEntryCard } from "./LibraryEntryCard";

type LibraryCardGridProps = {
  items: LibraryEntryPublicResponse[];
  className?: string;
};

export function LibraryCardGrid({ items, className }: LibraryCardGridProps) {
  return (
    <div
      className={`grid min-w-0 justify-items-center gap-4 sm:grid-cols-2 xl:grid-cols-4 ${className ?? ""}`}
    >
      {items.map((entry) => (
        <LibraryEntryCard key={entry.id} entry={entry} />
      ))}
    </div>
  );
}
