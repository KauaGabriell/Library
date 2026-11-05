import type { LibraryEntryDetailsPublicResponse } from "@library/contracts";
import { ImageUp, Pencil } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import {
  useUpdateLibraryEntry,
  useUpdateLibraryEntryCover,
} from "../../../hooks/useLibrary";
import { LibraryEntryActions } from "../../library/LibraryEntryActions";
import { BookCoverUploadField } from "../../library/BookCoverUploadField";
import { bookCoverImageSrc } from "../../../lib/bookCover";
import { Button } from "../../ui/Button";
import { Dialog } from "../../ui/Dialog";
import { ErrorState } from "../../ui/ErrorState";
import { Input } from "../../ui/Input";
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
  const [coverDialogOpen, setCoverDialogOpen] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverError, setCoverError] = useState("");
  const coverMutation = useUpdateLibraryEntryCover();
  const [pageCountDialogOpen, setPageCountDialogOpen] = useState(false);
  const [pageCountDraft, setPageCountDraft] = useState("");
  const [pageCountError, setPageCountError] = useState("");
  const pageCountMutation = useUpdateLibraryEntry();
  const authorLabel = book.authors?.length
    ? book.authors.join(", ")
    : "Autor desconhecido";

  function openCoverDialog() {
    coverMutation.reset();
    setCoverFile(null);
    setCoverError("");
    setCoverDialogOpen(true);
  }

  function closeCoverDialog() {
    if (coverMutation.isPending) return;
    setCoverDialogOpen(false);
  }

  function submitCover(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!coverFile) {
      setCoverError("Selecione uma imagem para continuar.");
      return;
    }

    coverMutation.mutate(
      { id: entry.id, coverFile },
      { onSuccess: () => setCoverDialogOpen(false) },
    );
  }

  function retryCoverUpdate() {
    if (!coverFile) return;
    coverMutation.mutate({ id: entry.id, coverFile });
  }

  function openPageCountDialog() {
    pageCountMutation.reset();
    setPageCountError("");
    setPageCountDraft(book.pageCount?.toString() ?? "");
    setPageCountDialogOpen(true);
  }

  function closePageCountDialog() {
    if (pageCountMutation.isPending) return;
    setPageCountDialogOpen(false);
  }

  function updatePageCount(pageCount: number | null) {
    pageCountMutation.mutate(
      { id: entry.id, patch: { pageCount } },
      { onSuccess: () => setPageCountDialogOpen(false) },
    );
  }

  function getPageCountDraftValue(): number | null | undefined {
    const trimmedDraft = pageCountDraft.trim();
    if (!trimmedDraft) return null;

    const pageCount = Number(trimmedDraft);
    if (!Number.isInteger(pageCount) || pageCount < 1) {
      setPageCountError("Informe um número inteiro maior que zero.");
      return undefined;
    }

    const currentPage = entry.currentPage ?? 0;
    if (pageCount < currentPage) {
      setPageCountError(
        `O total não pode ser menor que a página atual registrada (${currentPage}).`,
      );
      return undefined;
    }

    setPageCountError("");
    return pageCount;
  }

  function submitPageCount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const pageCount = getPageCountDraftValue();
    if (pageCount === undefined) return;

    updatePageCount(pageCount);
  }

  function retryPageCountUpdate() {
    const pageCount = getPageCountDraftValue();
    if (pageCount === undefined) return;

    updatePageCount(pageCount);
  }

  return (
    <section
      aria-label="Informações do livro"
      className="grid min-w-0 grid-cols-[minmax(6rem,7rem)_minmax(0,1fr)] gap-3 sm:grid-cols-[minmax(7rem,9.75rem)_minmax(0,1fr)] sm:gap-4 md:col-span-8"
    >
      <div className="col-span-2 min-w-0">
        <h2 className="font-heading text-[1.75rem] font-medium leading-[1.05] text-text-primary sm:text-[2rem]">
          {book.title}
        </h2>
        <p className="mt-2 font-heading text-base text-text-secondary sm:text-lg">
          {authorLabel}
        </p>
      </div>

      <div className="flex min-w-0 flex-col gap-2">
        {book.coverUrl ? (
          <img
            src={bookCoverImageSrc(book.coverUrl)}
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
        <Button
          type="button"
          variant="secondary"
          onClick={openCoverDialog}
          className="w-full px-2 text-xs"
          aria-label={`Alterar capa de ${book.title}`}
        >
          <ImageUp aria-hidden="true" className="size-4" />
          Alterar capa
        </Button>
      </div>

      <div className="flex min-w-0 flex-col">
        <LibraryEntryActions
          entry={entry}
          variant="detail"
          onDeleteSuccess={onDeleteSuccess}
        />

        <dl className="mt-3 border-y border-border-default/45 font-interface text-sm sm:mt-4">
          <div className="grid min-h-11 grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-x-3 border-b border-border-default/40 py-1.5">
            <dt className="text-xs font-semibold text-text-secondary">
              Páginas
            </dt>
            <dd className="grid min-w-0 grid-cols-[minmax(0,1fr)_2.75rem] items-center gap-x-2">
              <div className="min-w-0">
                <span className="font-medium tabular-nums text-text-primary">
                  {book.pageCount ?? "—"}
                </span>
                {book.pageCountSourceUrl && (
                  <a
                    className="mt-0.5 inline-block max-w-full break-words text-xs text-brand-primary underline underline-offset-2"
                    href={book.pageCountSourceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Fonte das páginas
                  </a>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                aria-label={`Editar número de páginas de ${book.title}`}
                title="Editar número de páginas"
                disabled={pageCountMutation.isPending}
                onClick={openPageCountDialog}
                className="size-11 min-h-11 min-w-11 justify-self-end p-0 text-text-secondary hover:text-brand-primary"
              >
                <Pencil aria-hidden="true" className="size-3.5" />
              </Button>
            </dd>
          </div>
          <div className="grid min-h-11 grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-x-3 py-2">
            <dt className="text-xs font-semibold text-text-secondary">
              Idioma
            </dt>
            <dd className="text-text-primary">{formatLanguage(book.language)}</dd>
          </div>
        </dl>
      </div>

      <BookDetailsCard className="col-span-2">
        <h2 className="font-heading text-lg leading-tight">Sinopse</h2>
        <p className="mt-3 whitespace-pre-line font-interface text-[0.8rem] leading-[1.7] text-text-secondary sm:text-sm">
          {plainBookDescription(book.description)}
        </p>
        {book.descriptionSourceUrl && (
          <a
            className="mt-3 inline-block font-interface text-xs text-brand-primary underline"
            href={book.descriptionSourceUrl}
            target="_blank"
            rel="noreferrer"
          >
            Fonte da sinopse
          </a>
        )}
      </BookDetailsCard>
      <Dialog
        open={coverDialogOpen}
        onClose={closeCoverDialog}
        title="Alterar capa do livro"
        size="compact"
      >
        <form className="flex flex-col gap-5" onSubmit={submitCover}>
          <p className="font-heading text-lg text-text-primary">{book.title}</p>
          <BookCoverUploadField
            file={coverFile}
            error={coverError}
            disabled={coverMutation.isPending}
            onChange={setCoverFile}
            onErrorChange={setCoverError}
          />
          {coverMutation.isError && (
            <ErrorState
              message={coverMutation.error.message}
              onRetry={retryCoverUpdate}
            />
          )}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              disabled={coverMutation.isPending}
              onClick={closeCoverDialog}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              loading={coverMutation.isPending}
              disabled={!coverFile || Boolean(coverError)}
            >
              Salvar capa
            </Button>
          </div>
        </form>
      </Dialog>
      <Dialog
        open={pageCountDialogOpen}
        onClose={closePageCountDialog}
        title="Editar número de páginas"
        size="compact"
      >
        <form className="flex flex-col gap-5" onSubmit={submitPageCount}>
          <p className="font-heading text-lg text-text-primary">{book.title}</p>
          <div>
            <Input
              label="Número de páginas"
              type="number"
              inputMode="numeric"
              min={Math.max(1, entry.currentPage ?? 0)}
              step={1}
              value={pageCountDraft}
              error={pageCountError}
              disabled={pageCountMutation.isPending}
              aria-describedby="page-count-help"
              onChange={(event) => {
                pageCountMutation.reset();
                setPageCountError("");
                setPageCountDraft(event.target.value);
              }}
            />
            <p
              id="page-count-help"
              className="mt-2 text-body-sm text-text-secondary"
            >
              Deixe em branco para voltar ao total salvo no cadastro do livro.
            </p>
          </div>
          {pageCountMutation.isError && (
            <ErrorState
              message={pageCountMutation.error.message}
              onRetry={retryPageCountUpdate}
            />
          )}
          <div className="flex flex-wrap justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              disabled={pageCountMutation.isPending}
              onClick={closePageCountDialog}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              loading={pageCountMutation.isPending}
              disabled={Boolean(pageCountError)}
            >
              Salvar páginas
            </Button>
          </div>
        </form>
      </Dialog>
    </section>
  );
}
