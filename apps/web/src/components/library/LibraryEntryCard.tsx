import type { LibraryEntryPublicResponse } from "@library/contracts";
import { Star } from "lucide-react";
import BookCover from "../../assets/bookCover.jpg";
import {
  getReadingStatusLabel,
  ReadingStatusBadge,
} from "../ui/ReadingStatusBadge";
import { LibraryEntryActions } from "./LibraryEntryActions";

type LibraryEntryCardProps = {
  entry: LibraryEntryPublicResponse;
  onOpen: () => void;
  onDeleteSuccess: (bookTitle: string) => void;
};

const ratingStars = [1, 2, 3, 4, 5] as const;

function formatUpdatedAt(updatedAt: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(
    new Date(updatedAt),
  );
}

function RatingStars({ rating }: { rating: number | null }) {
  return (
    <div className="flex items-center gap-2">
      <span
        role="img"
        aria-label={
          rating === null ? "Sem avaliação" : `Avaliação ${rating} de 5`
        }
        className="inline-flex items-center gap-0.5 text-brand-primary"
      >
        {ratingStars.map((star) => (
          <Star
            key={star}
            aria-hidden="true"
            className="size-3.5"
            fill={rating !== null && star <= rating ? "currentColor" : "none"}
            strokeWidth={1.75}
          />
        ))}
      </span>
      {rating === null ? (
        <span className="font-interface text-xs text-text-muted">
          Sem avaliação
        </span>
      ) : (
        <span className="font-interface text-xs tabular-nums text-text-secondary">
          {rating}/5
        </span>
      )}
    </div>
  );
}

export function LibraryEntryCard({
  entry,
  onOpen,
  onDeleteSuccess,
}: LibraryEntryCardProps) {
  const authors = entry.book.authors?.length
    ? entry.book.authors.join(", ")
    : "Autor desconhecido";

  return (
    <article
      aria-label={entry.book.title}
      className="mx-auto flex w-full max-w-72 min-w-0 flex-col overflow-hidden rounded-card border border-border-default/70 bg-background-canvas shadow-[0_4px_14px_rgba(47,36,17,0.10)] transition-shadow duration-200 hover:shadow-[0_12px_24px_rgba(47,36,17,0.14)] motion-reduce:transition-none"
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Ver detalhes de ${entry.book.title}. Status de leitura: ${getReadingStatusLabel(entry.status)}`}
        className="group relative h-52 overflow-hidden bg-background-surface text-left sm:h-56"
      >
        <img
          src={entry.book.coverUrl ?? BookCover}
          alt={entry.book.coverUrl ? `Capa de ${entry.book.title}` : ""}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.025] motion-reduce:transition-none"
          loading="lazy"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/75 via-black/10 to-transparent"
        />
        <div className="absolute right-3 top-3">
          <ReadingStatusBadge
            status={entry.status}
            appearance="default"
            className="shadow-sm"
          />
        </div>
        <div className="absolute inset-x-3 bottom-3 text-background-canvas drop-shadow-sm">
          <h2 className="line-clamp-2 font-heading text-lg leading-tight">
            {entry.book.title}
          </h2>
          <p className="mt-1 line-clamp-1 font-interface text-xs text-white/85">
            {authors}
          </p>
        </div>
      </button>

      <div className="flex flex-1 flex-col p-3">
        <div className="mt-1">
          <RatingStars rating={entry.rating} />
        </div>
        <p className="mt-1 font-interface text-[0.7rem] text-text-muted">
          Atualizado{" "}
          <time dateTime={entry.updatedAt}>
            {formatUpdatedAt(entry.updatedAt)}
          </time>
        </p>
        <div className="my-3 h-px bg-border-default/60" />
        <LibraryEntryActions
          entry={entry}
          variant="table"
          onDeleteSuccess={onDeleteSuccess}
        />
      </div>
    </article>
  );
}
