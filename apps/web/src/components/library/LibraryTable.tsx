import type { LibraryEntryPublicResponse } from "@library/contracts";
import { Star } from "lucide-react";
import { Link } from "react-router";
import BookCover from "../../assets/bookCover.jpg";
import { ReadingStatusBadge } from "../ui/ReadingStatusBadge";
import { LibraryEntryActions } from "./LibraryEntryActions";

type LibraryTableProps = {
  items: LibraryEntryPublicResponse[];
  onDeleteSuccess: (bookTitle: string) => void;
};

const ratingStars = [1, 2, 3, 4, 5] as const;

function authorsLabel(authors: string[] | null) {
  return authors?.length ? authors.join(", ") : "Autor desconhecido";
}

function formatAddedAt(createdAt: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
    .format(new Date(createdAt))
    .replace(/ de /g, " ")
    .replace(".", "");
}

function RatingStars({ rating }: { rating: number | null }) {
  if (rating === null) {
    return (
      <span role="img" aria-label="Sem avaliação" className="text-text-muted">
        –
      </span>
    );
  }

  return (
    <span
      role="img"
      aria-label={`Avaliação ${rating} de 5`}
      className="inline-flex items-center gap-px text-brand-primary"
    >
      {ratingStars.map((star) => (
        <Star
          key={star}
          aria-hidden="true"
          className="size-3"
          fill={star <= rating ? "currentColor" : "none"}
          strokeWidth={1.75}
        />
      ))}
    </span>
  );
}

export function LibraryTable({ items, onDeleteSuccess }: LibraryTableProps) {
  return (
    <div className="overflow-x-auto rounded-card border border-border-default/70 bg-background-canvas">
      <table
        aria-label="Livros na biblioteca"
        className="w-full min-w-184 table-fixed border-collapse text-left"
      >
        <colgroup>
          <col className="w-[42%]" />
          <col className="w-[17%]" />
          <col className="w-[17%]" />
          <col className="w-[9%]" />
          <col className="w-[15%]" />
        </colgroup>
        <thead className="bg-background-surface text-label-caps uppercase text-text-secondary">
          <tr>
            <th scope="col" className="px-4 py-3">
              Livro
            </th>
            <th scope="col" className="px-3 py-3">
              Adicionado
            </th>
            <th scope="col" className="px-3 py-3">
              Estado
            </th>
            <th scope="col" className="px-3 py-3">
              Nota
            </th>
            <th scope="col" className="px-3 py-3 text-right">
              Ações
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((entry) => {
            const authors = authorsLabel(entry.book.authors);

            return (
              <tr
                key={entry.id}
                className="border-t border-border-default/60 transition-colors hover:bg-background-surface/40 motion-reduce:transition-none"
              >
                <th scope="row" className="px-4 py-3 text-left font-normal">
                  <div className="flex min-w-0 items-center gap-3">
                    <img
                      src={entry.book.coverUrl ?? BookCover}
                      alt={
                        entry.book.coverUrl
                          ? `Capa de ${entry.book.title}, por ${authors}`
                          : ""
                      }
                      className="aspect-2/3 w-9 shrink-0 rounded-sm bg-background-surface object-cover"
                      loading="lazy"
                    />
                    <div className="min-w-0">
                      <Link
                        to={`/library/${encodeURIComponent(entry.id)}`}
                        className="line-clamp-1 font-heading text-base font-medium leading-tight text-text-primary hover:text-brand-primary focus-visible:rounded-sm"
                      >
                        {entry.book.title}
                      </Link>
                      <p className="mt-1 line-clamp-1 font-interface text-body-sm text-text-secondary">
                        {authors}
                      </p>
                    </div>
                  </div>
                </th>
                <td className="px-3 py-3 font-interface text-body-sm tabular-nums text-text-secondary">
                  {formatAddedAt(entry.createdAt)}
                </td>
                <td className="px-3 py-3">
                  <ReadingStatusBadge status={entry.status} />
                </td>
                <td className="px-3 py-3 font-interface text-body-sm text-text-primary">
                  <RatingStars rating={entry.rating} />
                </td>
                <td className="px-2 py-3">
                  <LibraryEntryActions
                    entry={entry}
                    variant="table"
                    onDeleteSuccess={onDeleteSuccess}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
