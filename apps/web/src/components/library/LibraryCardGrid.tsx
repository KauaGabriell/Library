import type { LibraryEntryPublicResponse } from "@library/contracts";
import { useNavigate } from "react-router";
import { LibraryEntryCard } from "./LibraryEntryCard";

type LibraryCardGridProps = {
  items: LibraryEntryPublicResponse[];
  className?: string;
  onDeleteSuccess: (bookTitle: string) => void;
};

export function LibraryCardGrid({
  items,
  className,
  onDeleteSuccess,
}: LibraryCardGridProps) {
  const navigate = useNavigate();

  return (
    <div
      className={`grid min-w-0 justify-items-center gap-4 sm:grid-cols-2 xl:grid-cols-4 ${className ?? ""}`}
    >
      {items.map((entry) => (
        <LibraryEntryCard
          key={entry.id}
          entry={entry}
          onOpen={() => navigate(`/library/${encodeURIComponent(entry.id)}`)}
          onDeleteSuccess={onDeleteSuccess}
        />
      ))}
    </div>
  );
}
