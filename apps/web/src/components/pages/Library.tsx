import type { LibraryEntryCreateInput, ReadingState } from "@library/contracts";
import { Plus, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { useDebouncedValue } from "../../hooks/useDebounce";
import { useAddLibraryEntry, useLibraryEntries } from "../../hooks/useLibrary";
import { LibraryCardGrid } from "../library/LibraryCardGrid";
import { LibraryPagination } from "../library/LibraryPagination";
import { LibrarySkeleton } from "../library/LibrarySkeleton";
import { LibraryTable } from "../library/LibraryTable";
import { LibraryToolbar, type LibraryView } from "../library/LibraryToolbar";
import { ManualBookFormDialog } from "../search/ManualBookFormDialog";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { ErrorState } from "../ui/ErrorState";

const PAGE_SIZE = 8;

type ManualBookInput = Extract<LibraryEntryCreateInput, { source: "MANUAL" }>;

const EMPTY_STATUS_COUNTS: Record<ReadingState, number> = {
  WANT_TO_READ: 0,
  READING: 0,
  READ: 0,
};

export function Library() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ReadingState>();
  const [sortBy, setSortBy] = useState<"updatedAt" | "createdAt">("updatedAt");
  const [page, setPage] = useState(1);
  const [view, setView] = useState<LibraryView>("table");
  const [statusMessage, setStatusMessage] = useState("");
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
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
  const addLibraryEntryMutation = useAddLibraryEntry();

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
    setStatusMessage(`“${bookTitle}” foi removido da biblioteca.`);
    window.requestAnimationFrame(() => headingRef.current?.focus());
  }

  function openManualDialog() {
    addLibraryEntryMutation.reset();
    setStatusMessage("");
    setManualDialogOpen(true);
  }

  function closeManualDialog() {
    if (addLibraryEntryMutation.isPending) return;

    addLibraryEntryMutation.reset();
    setManualDialogOpen(false);
  }

  function handleManualBookCreated(title: string) {
    setManualDialogOpen(false);
    setStatusMessage(`${title} foi adicionado à biblioteca.`);
  }

  function submitManualBook(input: ManualBookInput) {
    addLibraryEntryMutation.mutate(input, {
      onSuccess: () => handleManualBookCreated(input.title),
    });
  }

  function retryManualBookCreation() {
    const previousInput = addLibraryEntryMutation.variables;
    if (previousInput?.source !== "MANUAL") return;

    addLibraryEntryMutation.mutate(previousInput, {
      onSuccess: () => handleManualBookCreated(previousInput.title),
    });
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
            {statusMessage}
          </p>
          <p className="mt-2 font-interface text-sm text-text-secondary">
            Organize seus livros e acompanhe cada leitura.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Link
            to="/search"
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-field border border-border-control bg-background-surface px-4 py-2 text-label-md text-text-primary transition-colors hover:bg-background-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary motion-reduce:transition-none sm:w-auto"
          >
            <Search aria-hidden="true" className="size-4" />
            Buscar no catálogo
          </Link>
          <Button
            type="button"
            onClick={openManualDialog}
            className="w-full justify-center gap-2 sm:w-auto"
          >
            <Plus aria-hidden="true" className="size-4" />
            Adicionar manualmente
          </Button>
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
          description="Busque no catálogo ou cadastre um livro manualmente para começar sua biblioteca pessoal."
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

      <ManualBookFormDialog
        open={manualDialogOpen}
        initialTitle=""
        pending={addLibraryEntryMutation.isPending}
        error={
          addLibraryEntryMutation.isError
            ? addLibraryEntryMutation.error.message
            : undefined
        }
        onClose={closeManualDialog}
        onSubmit={submitManualBook}
        onRetry={
          addLibraryEntryMutation.isError ? retryManualBookCreation : undefined
        }
      />
    </div>
  );
}
