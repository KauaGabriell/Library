import type { LibraryEntryDetailsPublicResponse } from "@library/contracts";
import { Check, Pencil, X } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { useUpdateLibraryEntry } from "../../../hooks/useLibrary";
import { Button } from "../../ui/Button";
import { BookDetailsCard } from "./BookDetailsCard";

type ReadingProgressSectionProps = {
  entry: LibraryEntryDetailsPublicResponse;
};

export function ReadingProgressSection({ entry }: ReadingProgressSectionProps) {
  const progressMutation = useUpdateLibraryEntry();
  const [progressEditorOpen, setProgressEditorOpen] = useState(false);
  const [progressDraft, setProgressDraft] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const progressInputRef = useRef<HTMLInputElement>(null);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const wasEditorOpenRef = useRef(false);
  const { book } = entry;
  const currentPage = entry.currentPage ?? 0;
  const progressPercent = entry.progressPercent;
  const canEditProgress = entry.status === "READING" && book.pageCount !== null;

  useEffect(() => {
    if (progressEditorOpen) {
      progressInputRef.current?.focus();
    } else if (wasEditorOpenRef.current) {
      editButtonRef.current?.focus();
    }

    wasEditorOpenRef.current = progressEditorOpen;
  }, [progressEditorOpen]);

  function openProgressEditor() {
    setStatusMessage("");
    setProgressDraft(String(entry.currentPage ?? 0));
    progressMutation.reset();
    setProgressEditorOpen(true);
  }

  function saveProgress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const currentPageDraft = Number(progressDraft);
    const pageCount = book.pageCount;

    if (
      entry.status !== "READING" ||
      pageCount === null ||
      pageCount === undefined ||
      progressDraft.trim() === "" ||
      !Number.isInteger(currentPageDraft) ||
      currentPageDraft < 0 ||
      currentPageDraft > pageCount
    ) {
      return;
    }

    progressMutation.mutate(
      { id: entry.id, patch: { currentPage: currentPageDraft } },
      {
        onSuccess: () => {
          setStatusMessage("Progresso atualizado.");
          setProgressEditorOpen(false);
        },
      },
    );
  }

  return (
    <BookDetailsCard className="min-h-[6.9rem] px-4 py-4 sm:px-5">
      <h2 className="font-heading text-lg leading-tight">Progresso</h2>
      <div className="mt-2 flex items-center justify-between gap-3 font-interface text-[0.65rem]">
        <span className="font-semibold text-text-secondary">Páginas lidas</span>
        {progressEditorOpen ? (
          <form onSubmit={saveProgress} className="flex items-center gap-1">
            <label htmlFor="current-page" className="sr-only">
              Página atual
            </label>
            <input
              id="current-page"
              type="number"
              inputMode="numeric"
              ref={progressInputRef}
              min={0}
              max={book.pageCount ?? undefined}
              step={1}
              required
              value={progressDraft}
              onChange={(event) => setProgressDraft(event.target.value)}
              aria-describedby="current-page-hint"
              className="h-11 w-16 rounded-field border border-border-control bg-background-canvas px-2 text-right font-interface text-xs tabular-nums text-text-primary"
            />
            <span className="tabular-nums text-text-primary">
              / {book.pageCount ?? "—"}
            </span>
            <Button
              type="submit"
              aria-label="Salvar páginas lidas"
              title="Salvar"
              loading={progressMutation.isPending}
              className="size-11 min-h-11 p-0"
            >
              <Check aria-hidden="true" className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              aria-label="Cancelar alteração de páginas lidas"
              title="Cancelar"
              disabled={progressMutation.isPending}
              onClick={() => {
                setProgressEditorOpen(false);
                progressMutation.reset();
              }}
              className="size-11 min-h-11 p-0 text-text-secondary"
            >
              <X aria-hidden="true" className="size-3.5" />
            </Button>
          </form>
        ) : (
          <div className="flex items-center gap-1">
            <span className="tabular-nums text-text-primary">
              {currentPage} / {book.pageCount ?? "—"}
            </span>
            <Button
              type="button"
              variant="ghost"
              ref={editButtonRef}
              aria-label="Editar páginas lidas"
              title={
                canEditProgress
                  ? "Editar páginas lidas"
                  : book.pageCount === null
                    ? "Informe o total de páginas para editar o progresso"
                    : "Altere o estado para “Lendo” para editar o progresso"
              }
              disabled={!canEditProgress || progressMutation.isPending}
              onClick={openProgressEditor}
              className="size-11 min-h-11 p-0 text-text-secondary hover:text-brand-primary disabled:cursor-not-allowed"
            >
              <Pencil aria-hidden="true" className="size-3.5" />
            </Button>
          </div>
        )}
      </div>
      <span id="current-page-hint" className="sr-only">
        Informe um número inteiro entre 0 e{" "}
        {book.pageCount ?? "o total de páginas"}.
      </span>
      {progressPercent !== null && (
        <>
          <div
            role="progressbar"
            aria-label="Progresso de leitura"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border-default/45"
          >
            <div
              className="h-full rounded-full bg-brand-primary transition-[width]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="mt-1 font-interface text-[0.65rem] text-text-secondary">
            {progressPercent === 100 && entry.status === "READ"
              ? "Concluído"
              : `${progressPercent}% completo`}
          </p>
        </>
      )}
      {progressMutation.isError && (
        <p role="alert" className="mt-1 text-[0.65rem] text-feedback-error">
          {progressMutation.error.message ||
            "Não foi possível atualizar o progresso."}
        </p>
      )}
      <p role="status" aria-live="polite" className="sr-only">
        {statusMessage}
      </p>
    </BookDetailsCard>
  );
}
