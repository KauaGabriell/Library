import type { BookSearchItem } from "@library/contracts";
import { BookOpen, BookPlus, Eye } from "lucide-react";
import BookCover from "../../assets/bookCover.jpg";
import { Button } from "../ui/Button";

type CatalogBookCardProps = {
  book: BookSearchItem;
};

export function CatalogBookCard({ book }: CatalogBookCardProps) {
  const authorLabel = book.authors.length
    ? book.authors.join(", ")
    : "Autor desconhecido";

  return (
    <article className="flex min-w-0 flex-col rounded-card border border-border-default/55 bg-background-canvas p-3 shadow-[0_1px_3px_rgba(47,36,17,0.035)] transition-[border-color,box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:border-brand-primary/35 hover:shadow-[0_8px_24px_rgba(47,36,17,0.09)] motion-reduce:transform-none motion-reduce:transition-none sm:p-3.5">
      <div className="relative mb-3 overflow-hidden rounded-field bg-background-surface">
        {book.coverUrl ? (
          <img
            src={book.coverUrl}
            alt={`Capa de ${book.title}, por ${authorLabel}`}
            className="aspect-3/4 w-full object-cover"
            loading="lazy"
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = BookCover;
            }}
          />
        ) : (
          <div
            aria-label={`Capa indisponível para ${book.title}`}
            role="img"
            className="flex aspect-3/4 w-full items-center justify-center bg-background-surface text-brand-primary"
          >
            <BookOpen aria-hidden="true" className="size-10" strokeWidth={1.4} />
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <h2 className="line-clamp-2 min-h-11 font-heading text-lg font-medium leading-tight text-text-primary">
          {book.title}
        </h2>
        <p className="mt-1 truncate font-interface text-xs text-text-secondary">
          {authorLabel}
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {book.language && (
            <span className="inline-flex items-center rounded-sm bg-background-surface px-2 py-1 font-interface text-[0.65rem] leading-none text-text-secondary">
              {book.language.toUpperCase()}
            </span>
          )}
          {book.pageCount !== null && (
            <span className="inline-flex items-center gap-1 rounded-sm bg-background-surface px-2 py-1 font-interface text-[0.65rem] leading-none text-text-secondary">
              <BookOpen aria-hidden="true" className="size-3" />
              {book.pageCount} páginas
            </span>
          )}
        </div>

        <div className="mt-auto pt-5">
          <Button
            type="button"
            disabled
            className="min-h-11 w-full gap-2 rounded-field px-2 text-xs leading-tight"
          >
            <BookPlus aria-hidden="true" className="size-4 shrink-0" />
            <span>Adicionar à biblioteca</span>
          </Button>
          <Button
            type="button"
            disabled
            variant="ghost"
            className="mt-1 min-h-10 w-full gap-2 px-2 text-xs"
          >
            <Eye aria-hidden="true" className="size-3.5" />
            Ver detalhes
          </Button>
        </div>
      </div>
    </article>
  );
}
