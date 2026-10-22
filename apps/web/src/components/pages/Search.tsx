import type { BookSearchQuery, BookSearchResponse } from "@library/contracts";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Grid2X2,
  Info,
  List,
  Search as SearchIcon,
} from "lucide-react";
import { useState } from "react";
import { useDebouncedValue } from "../../hooks/useDebounce";
import { fetcher } from "../../lib/api";
import { CatalogBookCard } from "../search/CatalogBookCard";
import { CatalogWelcomeState } from "../search/CatalogWelcomeState";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { ErrorState } from "../ui/ErrorState";
import { LoadingState } from "../ui/LoadingState";

type SearchFieldProps = {
  value: string;
  onQueryChange: (value: string) => void;
  onSearch: () => void;
};

function SearchField({ value, onQueryChange, onSearch }: SearchFieldProps) {
  return (
    <search>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSearch();
        }}
        className="flex min-h-12 max-w-3xl items-center gap-3 rounded-full border border-border-default/60 bg-background-surface px-4 shadow-[0_1px_3px_rgba(47,36,17,0.04)] transition-shadow focus-within:border-brand-primary/50 focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-brand-primary)_12%,transparent)]"
      >
      <label htmlFor="catalog-search" className="sr-only">
        Buscar livros por título, autor ou gênero
      </label>
      <SearchIcon
        aria-hidden="true"
        className="size-4 shrink-0 text-text-secondary"
      />
      <input
        id="catalog-search"
        type="search"
        value={value}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Título, autor ou gênero"
        className="min-w-0 flex-1 bg-transparent font-interface text-sm text-text-primary outline-none"
      />
      <Button
        type="submit"
        aria-label="Pesquisar no catálogo"
        disabled={value.trim().length < 2}
        className="size-9 min-h-9 shrink-0 rounded-full p-0"
      >
        <ArrowRight aria-hidden="true" className="size-4" />
      </Button>
      </form>
    </search>
  );
}

function ResultsToolbar({ resultCount }: { resultCount: number }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border-default/45 pb-4">
      <p className="font-interface text-sm text-text-secondary">
        <span className="font-semibold text-text-primary">
          {resultCount} resultados encontrados
        </span>
      </p>
      <div className="flex items-center gap-3">
        <label
          htmlFor="catalog-sort"
          className="hidden font-interface text-xs text-text-secondary sm:inline"
        >
          Ordenar por:
        </label>
        <select
          id="catalog-sort"
          disabled
          defaultValue="relevance"
          className="min-h-10 rounded-field border border-border-default/70 bg-background-canvas px-3 font-interface text-xs text-text-primary disabled:cursor-not-allowed disabled:opacity-80"
        >
          <option value="relevance">Mais relevantes</option>
        </select>
        <fieldset
          aria-label="Opções de visualização"
          className="hidden items-center gap-1 sm:flex"
        >
          <Button
            aria-label="Visualização em grade"
            aria-pressed="true"
            disabled
            variant="secondary"
            className="size-10 min-h-10 rounded-field border-brand-primary/30 bg-brand-primary/5 p-0 text-brand-primary"
          >
            <Grid2X2 aria-hidden="true" className="size-4" />
          </Button>
          <Button
            aria-label="Visualização em lista"
            aria-pressed="false"
            disabled
            variant="secondary"
            className="size-10 min-h-10 rounded-field p-0"
          >
            <List aria-hidden="true" className="size-4" />
          </Button>
        </fieldset>
      </div>
    </div>
  );
}

type PaginationProps = {
  page: number;
  nextPage: number | null;
  resultCount: number;
  onPageChange: (page: number) => void;
};

function SearchPagination({
  page,
  nextPage,
  resultCount,
  onPageChange,
}: PaginationProps) {
  return (
    <nav
      aria-label="Paginação dos resultados"
      className="flex flex-wrap items-center justify-between gap-4 pt-6"
    >
      <p className="font-interface text-xs text-text-secondary">
        Exibindo{" "}
        <span className="font-semibold text-text-primary">
          {resultCount}
        </span>{" "}
        livros nesta página
      </p>
      <div className="flex items-center gap-1.5">
        <Button
          aria-label="Página anterior"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          variant="secondary"
          className="size-9 min-h-9 rounded-field p-0"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
        </Button>
        <span
          aria-live="polite"
          className="px-2 font-interface text-xs text-text-secondary"
        >
          Página {page}
        </span>
        <Button
          aria-label="Próxima página"
          disabled={nextPage === null}
          onClick={() => {
            if (nextPage !== null) onPageChange(nextPage);
          }}
          variant="secondary"
          className="size-9 min-h-9 rounded-field p-0"
        >
          <ArrowRight aria-hidden="true" className="size-4" />
        </Button>
      </div>
    </nav>
  );
}

export function Search() {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const debouncedQuery = useDebouncedValue(query, 300);
  const normalizedQuery = (submittedQuery ?? debouncedQuery).trim();
  const pageSize = 10;

  function handleQueryChange(value: string) {
    setQuery(value);
    setSubmittedQuery(null);
    setPage(1);
  }

  function handleSearch() {
    setSubmittedQuery(query);
    setPage(1);
  }

  function searchBooks({ q, page, pageSize }: BookSearchQuery) {
    const params = new URLSearchParams({
      q,
      page: String(page),
      pageSize: String(pageSize),
    });

    return fetcher<BookSearchResponse>(`/books/search?${params}`);
  }

  const books = useQuery({
    queryKey: ["books", "search", normalizedQuery, page, pageSize],
    queryFn: () => searchBooks({ q: normalizedQuery, page, pageSize }),
    enabled: normalizedQuery.length >= 2,
    retry: false,
  });

  const resultItems = books.data?.items ?? [];
  const hasValidQuery = normalizedQuery.length >= 2;

  const resultsContent = !hasValidQuery ? (
    <CatalogWelcomeState />
  ) : books.isFetching ? (
    <LoadingState label="Buscando livros..." />
  ) : books.isError ? (
    <ErrorState
      message="Não foi possível buscar livros. Tente novamente."
      onRetry={() => void books.refetch()}
    />
  ) : resultItems.length === 0 ? (
    <EmptyState
      title="Nenhum livro encontrado"
      description="Tente buscar por outro título, autor ou gênero."
    />
  ) : (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-5">
      {resultItems.map((book) => (
        <CatalogBookCard key={book.googleBooksId} book={book} />
      ))}
    </div>
  );

  return (
    <div className="-mx-4 -my-8 min-h-[calc(100dvh-4rem)] bg-background-surface/35 md:-mx-6 md:-my-8 lg:-mx-12 lg:-my-12">
      <header className="bg-background-canvas px-5 pb-8 pt-8 sm:px-8 sm:pb-10 lg:px-12 lg:pb-10 lg:pt-12">
        <div className="mx-auto max-w-7xl">
          <p className="mb-2 font-interface text-label-caps uppercase text-brand-primary">
            Catálogo e descobertas
          </p>
          <h1 className="font-heading text-[2rem] leading-tight font-semibold tracking-[-0.02em] text-text-primary sm:text-[2.5rem]">
            Descubra novas histórias
          </h1>
          <p className="mt-2 font-interface text-sm text-text-secondary sm:text-base">
            Encontre sua próxima leitura por título, autor ou gênero.
          </p>
          <div className="mt-6">
            <SearchField
              value={query}
              onQueryChange={handleQueryChange}
              onSearch={handleSearch}
            />
            <p className="mt-3 flex max-w-3xl items-start gap-2 font-interface text-xs leading-relaxed text-text-secondary sm:text-sm">
              <Info
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-brand-primary"
              />
              <span>Esta busca consulta o catálogo do Google Livros.</span>
            </p>
          </div>
        </div>
      </header>
      <section
        aria-label="Resultados do catálogo"
        className="px-5 pb-10 pt-7 sm:px-8 lg:px-12 lg:pt-8"
      >
        <div className="mx-auto max-w-7xl">
          {hasValidQuery && books.isSuccess && (
            <ResultsToolbar resultCount={resultItems.length} />
          )}
          <div className="mt-6">{resultsContent}</div>
          {hasValidQuery && books.isSuccess && resultItems.length > 0 && (
            <SearchPagination
              page={page}
              nextPage={books.data?.nextPage ?? null}
              resultCount={resultItems.length}
              onPageChange={setPage}
            />
          )}
        </div>
      </section>
    </div>
  );
}
