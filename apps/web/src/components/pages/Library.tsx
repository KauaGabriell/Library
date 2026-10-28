import type { ReadingState } from "@library/contracts";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useDebouncedValue } from "../../hooks/useDebounce";
import { useLibraryEntries } from "../../hooks/useLibrary";
import { LibraryCardGrid } from "../library/LibraryCardGrid";
import { LibraryPagination } from "../library/LibraryPagination";
import { LibrarySkeleton } from "../library/LibrarySkeleton";
import { LibraryTable } from "../library/LibraryTable";
import { LibraryToolbar, type LibraryView } from "../library/LibraryToolbar";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { ErrorState } from "../ui/ErrorState";

const PAGE_SIZE = 8;

const EMPTY_STATUS_COUNTS: Record<ReadingState, number> = {
  WANT_TO_READ: 0,
  READING: 0,
  READ: 0,
};

export function Library() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ReadingState>();
  const [sortBy, setSortBy] = useState<"updatedAt" | "createdAt">("updatedAt");
  const [page, setPage] = useState(1);
  const [view, setView] = useState<LibraryView>("table");
  const [deleteStatusMessage, setDeleteStatusMessage] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const debouncedSearch = useDebouncedValue(search, 300).trim();
  const isSearchTooShort = debouncedSearch.length === 1;
  const query = {
    q: debouncedSearch.length >= 2 ? debouncedSearch : undefined,
    status,
    page,
    pageSize: PAGE_SIZE,
    sortBy,
  };
  const libraryQuery = useLibraryEntries(query, !isSearchTooShort);

  useEffect(() => {
    if (libraryQuery.data && libraryQuery.data.page !== page) {
      setPage(libraryQuery.data.page);
    }
  }, [libraryQuery.data, page]);

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleStatusChange(value?: ReadingState) {
    setStatus(value);
    setPage(1);
  }

  function handleSortChange(value: "updatedAt" | "createdAt") {
    setSortBy(value);
    setPage(1);
  }

  function handleDeleteSuccess(bookTitle: string) {
    setDeleteStatusMessage(`“${bookTitle}” foi removido da biblioteca.`);
    window.requestAnimationFrame(() => headingRef.current?.focus());
  }

  const result = libraryQuery.data;
  const hasNoLibraryEntries =
    result?.totalItems === 0 && !query.q && !query.status;
  const hasNoFilteredResults = result?.totalItems === 0 && !hasNoLibraryEntries;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 font-interface text-label-caps uppercase text-brand-primary">
            Suas leituras
          </p>
          <h1
            ref={headingRef}
            data-route-focus="/library"
            tabIndex={-1}
            className="font-heading text-[2rem] leading-tight font-semibold text-text-primary sm:text-[2.5rem]"
          >
            Minha biblioteca
          </h1>
          <p role="status" aria-live="polite" className="sr-only">
            {deleteStatusMessage}
          </p>
          <p className="mt-2 font-interface text-sm text-text-secondary">
            Organize seus livros e acompanhe cada leitura.
          </p>
        </div>
      </header>

      <LibraryToolbar
        search={search}
        status={status}
        sortBy={sortBy}
        counts={result?.countsByStatus ?? EMPTY_STATUS_COUNTS}
        view={view}
        onSearchChange={handleSearchChange}
        onStatusChange={handleStatusChange}
        onSortChange={handleSortChange}
        onViewChange={setView}
        onAddBook={() => navigate("/search")}
      />

      {isSearchTooShort ? (
        <p role="status" className="text-body-sm text-text-secondary">
          Digite pelo menos 2 caracteres para buscar na biblioteca.
        </p>
      ) : libraryQuery.isPending ? (
        <LibrarySkeleton />
      ) : libraryQuery.isError ? (
        <ErrorState
          message="Não foi possível carregar sua biblioteca."
          onRetry={() => void libraryQuery.refetch()}
        />
      ) : hasNoLibraryEntries ? (
        <EmptyState
          title="Sua biblioteca começa com um livro"
          description="Busque no catálogo e adicione títulos à sua biblioteca pessoal."
          action={
            <Link
              to="/search"
              className="inline-flex min-h-11 items-center rounded-field bg-brand-primary px-4 py-2 text-label-md text-background-canvas hover:bg-brand-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
            >
              Adicionar livro
            </Link>
          }
        />
      ) : hasNoFilteredResults ? (
        <EmptyState
          title="Nenhum resultado encontrado"
          description="Tente alterar a busca ou o filtro de status."
          action={
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setSearch("");
                setStatus(undefined);
                setPage(1);
              }}
            >
              Limpar filtros
            </Button>
          }
        />
      ) : result && result.items.length > 0 ? (
        <>
          <div className="lg:hidden">
            <LibraryCardGrid
              items={result.items}
              onDeleteSuccess={handleDeleteSuccess}
            />
          </div>
          <div className="hidden lg:block">
            {view === "table" ? (
              <LibraryTable
                items={result.items}
                onDeleteSuccess={handleDeleteSuccess}
              />
            ) : (
              <LibraryCardGrid
                items={result.items}
                className="xl:grid-cols-4"
                onDeleteSuccess={handleDeleteSuccess}
              />
            )}
          </div>
          <LibraryPagination
            page={result.page}
            totalPages={result.totalPages}
            totalItems={result.totalItems}
            onPageChange={setPage}
          />
        </>
      ) : null}
    </div>
  );
}
