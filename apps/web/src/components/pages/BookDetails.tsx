import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useLibraryEntryDetails } from "../../hooks/useLibrary";
import { ErrorState } from "../ui/ErrorState";
import { LoadingState } from "../ui/LoadingState";
import { BookNotesSection } from "./book-details/BookNotesSection";
import { BookOverview } from "./book-details/BookOverview";
import { BookReviewSection } from "./book-details/BookReviewSection";
import { ReadingProgressSection } from "./book-details/ReadingProgressSection";

function PageFrame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-10 pt-5 sm:px-10 sm:pt-10 lg:px-12">
      {children}
    </div>
  );
}

export function BookDetails() {
  const { libraryId = "" } = useParams();
  const navigate = useNavigate();
  const detailQuery = useLibraryEntryDetails(libraryId);

  if (detailQuery.isPending) {
    return (
      <PageFrame>
        <LoadingState label="Carregando detalhes do livro" />
      </PageFrame>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <PageFrame>
        <div className="mx-auto max-w-3xl">
          <Link
            to="/library"
            className="mb-6 inline-flex min-h-11 items-center gap-2 text-body-sm text-text-secondary hover:text-text-primary"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Voltar
          </Link>
          <ErrorState
            message="Não foi possível carregar os detalhes deste livro."
            onRetry={() => void detailQuery.refetch()}
          />
        </div>
      </PageFrame>
    );
  }

  const entry = detailQuery.data;

  return (
    <PageFrame>
      <header className="relative mb-5 grid min-h-10 grid-cols-[1fr_auto_1fr] items-center border-b border-border-default/50 pb-1">
        <Link
          to="/library"
          className="inline-flex min-h-11 w-fit items-center gap-2 text-body-sm text-text-secondary transition-colors hover:text-text-primary"
        >
          <ArrowLeft aria-hidden="true" className="size-4" strokeWidth={1.8} />
          Voltar
        </Link>
        <h1
          data-route-focus={`/library/${libraryId}`}
          tabIndex={-1}
          className="font-heading text-base font-medium text-brand-primary"
        >
          Detalhes do Livro
        </h1>
        <span aria-hidden="true" />
      </header>

      <div className="grid gap-x-4 gap-y-5 md:grid-cols-12">
        <BookOverview
          entry={entry}
          onDeleteSuccess={() => navigate("/library", { replace: true })}
        />
        <aside className="flex flex-col gap-4 md:col-span-4">
          <ReadingProgressSection entry={entry} />
          {entry.status === "READ" && <BookReviewSection entry={entry} />}
        </aside>
        <BookNotesSection
          libraryId={libraryId}
          notes={entry.notes}
          canAddNote={entry.status !== "WANT_TO_READ"}
        />
      </div>
    </PageFrame>
  );
}
