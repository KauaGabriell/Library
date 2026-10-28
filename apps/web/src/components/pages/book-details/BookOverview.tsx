import type { LibraryEntryDetailsPublicResponse } from "@library/contracts";
import { LibraryEntryActions } from "../../library/LibraryEntryActions";
import { ReadingStatusBadge } from "../../ui/ReadingStatusBadge";
import { BookDetailsCard } from "./BookDetailsCard";

type BookOverviewProps = {
  entry: LibraryEntryDetailsPublicResponse;
  onDeleteSuccess: () => void;
};

function formatLanguage(language: string | null) {
  if (!language) return "—";

  const languageNames: Record<string, string> = {
    en: "Inglês",
    es: "Espanhol",
    fr: "Francês",
    pt: "Português",
  };
  const code = language.toLowerCase().split(/[-_]/)[0];

  return languageNames[code] ?? language;
}

function plainBookDescription(description: string | null) {
  if (!description) return "Sinopse indisponível para este livro.";

  const plainText = description
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p\s*>/gi, "\n\n")
    .replace(/<\/(?:div|li|h[1-6])\s*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .trim();

  return plainText || "Sinopse indisponível para este livro.";
}

export function BookOverview({ entry, onDeleteSuccess }: BookOverviewProps) {
  const { book } = entry;
  const authorLabel = book.authors?.length
    ? book.authors.join(", ")
    : "Autor desconhecido";

  return (
    <section
      aria-label="Informações do livro"
      className="grid min-w-0 grid-cols-[minmax(6rem,7rem)_minmax(0,1fr)] gap-3 sm:grid-cols-[minmax(7rem,9.75rem)_minmax(0,1fr)] sm:gap-4 md:col-span-8"
    >
      {book.coverUrl ? (
        <img
          src={book.coverUrl}
          alt={`Capa de ${book.title}`}
          className="aspect-2/3 w-full self-start rounded-sm border border-border-default/60 bg-background-surface object-cover shadow-[0_3px_9px_rgba(47,36,17,0.12)]"
        />
      ) : (
        <div
          role="img"
          aria-label={`Sem capa de ${book.title}`}
          className="flex aspect-2/3 w-full self-start items-center justify-center rounded-sm border border-border-default/60 bg-background-surface p-3 text-center font-interface text-sm text-text-muted"
        >
          Sem capa
        </div>
      )}

      <div className="flex min-w-0 flex-col">
        <h2 className="font-heading text-[1.75rem] font-medium leading-[1.05] text-text-primary sm:text-[2rem]">
          {book.title}
        </h2>
        <p className="mt-2 font-heading text-base text-text-secondary sm:text-lg">
          {authorLabel}
        </p>

        <dl className="mt-3 grid grid-cols-1 gap-y-2 border-y border-border-default/45 py-3 font-interface text-xs sm:mt-4 sm:grid-cols-2 sm:gap-3 sm:py-3.5">
          <div>
            <dt className="font-semibold tracking-[0.04em] text-text-secondary">
              Páginas
            </dt>
            <dd className="mt-0.5 text-text-primary">
              {book.pageCount ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="font-semibold tracking-[0.04em] text-text-secondary">
              Idioma
            </dt>
            <dd className="mt-0.5 text-text-primary">
              {formatLanguage(book.language)}
            </dd>
          </div>
        </dl>

        <div className="mt-3 flex min-h-16 flex-col items-start justify-between gap-2 rounded-field border border-border-default/45 px-3 py-2.5 sm:mt-4 sm:flex-row sm:items-center sm:px-4">
          <div className="min-w-0">
            <p className="font-interface text-[0.65rem] font-semibold leading-tight tracking-[0.06em] text-text-secondary">
              Estado de leitura
            </p>
            <ReadingStatusBadge status={entry.status} className="mt-1" />
          </div>
          <LibraryEntryActions
            entry={entry}
            variant="detail"
            onDeleteSuccess={onDeleteSuccess}
          />
        </div>
      </div>

      <BookDetailsCard className="col-span-2">
        <h2 className="font-heading text-lg leading-tight">Sinopse</h2>
        <p className="mt-3 whitespace-pre-line font-interface text-[0.8rem] leading-[1.7] text-text-secondary sm:text-sm">
          {plainBookDescription(book.description)}
        </p>
      </BookDetailsCard>
    </section>
  );
}
