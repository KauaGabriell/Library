import type {
  LibraryEntryDetailsPublicResponse,
  ReadingState,
} from "@library/contracts";
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Star,
  Trash2,
  X,
} from "lucide-react";
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  useCreateLibraryNote,
  useDeleteLibraryNote,
  useLibraryEntryDetails,
  useUpdateLibraryEntry,
  useUpdateLibraryNote,
} from "../../hooks/useLibrary";
import { LibraryEntryActions } from "../library/LibraryEntryActions";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";
import { ErrorState } from "../ui/ErrorState";
import { LoadingState } from "../ui/LoadingState";

const starValues = [1, 2, 3, 4, 5] as const;
const notesPerPage = 2;
const maxNoteLength = 10_000;

type BookNote = LibraryEntryDetailsPublicResponse["notes"][number];

const statusLabels: Record<ReadingState, string> = {
  WANT_TO_READ: "Quero ler",
  READING: "Lendo",
  READ: "Lido",
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

function DetailCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-card border border-border-default/50 bg-background-canvas p-5 sm:p-6 ${className}`}
    >
      {children}
    </section>
  );
}

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
  const updateMutation = useUpdateLibraryEntry();
  const progressMutation = useUpdateLibraryEntry();
  const reviewMutation = useUpdateLibraryEntry();
  const createNoteMutation = useCreateLibraryNote(libraryId);
  const updateNoteMutation = useUpdateLibraryNote();
  const deleteNoteMutation = useDeleteLibraryNote();
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [noteToEdit, setNoteToEdit] = useState<BookNote | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<BookNote | null>(null);
  const [noteContent, setNoteContent] = useState("");
  const [reviewDraft, setReviewDraft] = useState("");
  const [notesPage, setNotesPage] = useState(0);
  const [progressEditorOpen, setProgressEditorOpen] = useState(false);
  const [progressDraft, setProgressDraft] = useState("");
  const progressInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (progressEditorOpen) progressInputRef.current?.focus();
  }, [progressEditorOpen]);

  useEffect(() => {
    setReviewDraft(detailQuery.data?.review ?? "");
  }, [detailQuery.data?.review]);

  function closeNoteDialog() {
    setNoteDialogOpen(false);
    setNoteToEdit(null);
    setNoteContent("");
    createNoteMutation.reset();
    updateNoteMutation.reset();
  }

  function openNoteDialog(note?: BookNote) {
    setNoteToEdit(note ?? null);
    setNoteContent(note?.content ?? "");
    createNoteMutation.reset();
    updateNoteMutation.reset();
    setNoteDialogOpen(true);
  }

  function openProgressEditor(currentPage: number | null) {
    setProgressDraft(String(currentPage ?? 0));
    progressMutation.reset();
    setProgressEditorOpen(true);
  }

  function saveProgress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const currentPage = Number(progressDraft);
    const pageCount = detailQuery.data?.book.pageCount;

    if (
      detailQuery.data?.status !== "READING" ||
      pageCount === null ||
      pageCount === undefined ||
      progressDraft.trim() === "" ||
      !Number.isInteger(currentPage) ||
      currentPage < 0 ||
      currentPage > pageCount
    ) {
      return;
    }

    progressMutation.mutate(
      { id: detailQuery.data.id, patch: { currentPage } },
      { onSuccess: () => setProgressEditorOpen(false) },
    );
  }

  function saveNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = noteContent.trim();

    if (!content || content.length > maxNoteLength) return;

    if (noteToEdit) {
      updateNoteMutation.mutate(
        { noteId: noteToEdit.id, content },
        { onSuccess: closeNoteDialog },
      );
      return;
    }

    createNoteMutation.mutate(content, {
      onSuccess: () => {
        setNotesPage(0);
        closeNoteDialog();
      },
    });
  }

  function saveReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (detailQuery.data?.status !== "READ") return;

    const review = reviewDraft.trim();
    reviewMutation.mutate({
      id: detailQuery.data.id,
      patch: { review: review || null },
    });
  }

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
  const { book } = entry;
  const authorLabel = book.authors?.length
    ? book.authors.join(", ")
    : "Autor desconhecido";
  const currentPage = entry.currentPage ?? 0;
  const progressPercent = entry.progressPercent;
  const canRate = entry.status === "READ";
  const canAddNote = entry.status !== "WANT_TO_READ";
  const canEditProgress =
    entry.status === "READING" && book.pageCount !== null;
  const notesTotalPages = Math.ceil(entry.notes.length / notesPerPage);
  const activeNotesPage = Math.min(notesPage, Math.max(0, notesTotalPages - 1));
  const visibleNotes = entry.notes.slice(
    activeNotesPage * notesPerPage,
    (activeNotesPage + 1) * notesPerPage,
  );
  const firstVisibleNote = activeNotesPage * notesPerPage + 1;
  const lastVisibleNote = Math.min(
    (activeNotesPage + 1) * notesPerPage,
    entry.notes.length,
  );

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
        <h1 className="font-heading text-base font-medium text-brand-primary">
          Detalhes do Livro
        </h1>
        <span aria-hidden="true" />
      </header>

      <div className="grid gap-x-4 gap-y-5 md:grid-cols-12">
        <section
          aria-label="Informações do livro"
          className="grid min-w-0 grid-cols-[minmax(7rem,9.75rem)_minmax(0,1fr)] gap-4 sm:gap-5 md:col-span-8"
        >
          {book.coverUrl ? (
            <img
              src={book.coverUrl}
              alt={`Capa de ${book.title}`}
              className="aspect-[2/3] w-full self-start rounded-sm border border-border-default/60 bg-background-surface object-cover shadow-[0_3px_9px_rgba(47,36,17,0.12)]"
            />
          ) : (
            <div
              role="img"
              aria-label={`Sem capa de ${book.title}`}
              className="flex aspect-[2/3] w-full self-start items-center justify-center rounded-sm border border-border-default/60 bg-background-surface p-3 text-center font-interface text-sm text-text-muted"
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

            <dl className="mt-4 grid grid-cols-2 gap-3 border-y border-border-default/45 py-3 font-interface text-xs sm:mt-5 sm:py-3.5">
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

            <div className="mt-4 flex min-h-16 items-center justify-between gap-2 rounded-field border border-border-default/45 px-3 py-2.5 sm:mt-4 sm:px-4">
              <div className="min-w-0">
                <p className="font-interface text-[0.65rem] font-semibold leading-tight tracking-[0.06em] text-text-secondary">
                  Estado de leitura
                </p>
                <span
                  className={`mt-1 inline-flex rounded-full border px-2.5 py-0.5 font-interface text-xs ${
                    entry.status === "WANT_TO_READ"
                      ? "border-status-want-to-read-border bg-status-want-to-read text-status-want-to-read-foreground"
                      : entry.status === "READING"
                        ? "border-status-reading-border bg-status-reading text-status-reading-foreground"
                        : "border-status-read-border bg-status-read text-status-read-foreground"
                  }`}
                >
                  {statusLabels[entry.status]}
                </span>
              </div>
              <LibraryEntryActions
                entry={entry}
                variant="detail"
                onDeleteSuccess={() => navigate("/library", { replace: true })}
              />
            </div>
          </div>

          <DetailCard className="col-span-2">
            <h2 className="font-heading text-lg leading-tight">Sinopse</h2>
            <p className="mt-3 whitespace-pre-line font-interface text-[0.8rem] leading-[1.7] text-text-secondary sm:text-sm">
              {plainBookDescription(book.description)}
            </p>
          </DetailCard>
        </section>

        <aside className="flex flex-col gap-4 md:col-span-4">
          <DetailCard className="min-h-[6.9rem] px-4 py-4 sm:px-5">
            <h2 className="font-heading text-lg leading-tight">Progresso</h2>
            <div className="mt-2 flex items-center justify-between gap-3 font-interface text-[0.65rem]">
              <span className="font-semibold text-text-secondary">
                Páginas lidas
              </span>
              {progressEditorOpen ? (
                <form
                  onSubmit={saveProgress}
                  className="flex items-center gap-1"
                >
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
                    className="h-8 w-16 rounded-field border border-border-default bg-background-canvas px-2 text-right font-interface text-xs tabular-nums text-text-primary"
                  />
                  <span className="tabular-nums text-text-primary">
                    / {book.pageCount ?? "—"}
                  </span>
                  <Button
                    type="submit"
                    aria-label="Salvar páginas lidas"
                    title="Salvar"
                    loading={progressMutation.isPending}
                    className="size-8 min-h-8 p-0"
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
                    className="size-8 min-h-8 p-0 text-text-secondary"
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
                    aria-label="Editar páginas lidas"
                    title={
                      canEditProgress
                        ? "Editar páginas lidas"
                        : book.pageCount === null
                          ? "Informe o total de páginas para editar o progresso"
                          : "Altere o estado para “Lendo” para editar o progresso"
                    }
                    disabled={!canEditProgress || progressMutation.isPending}
                    onClick={() => openProgressEditor(entry.currentPage)}
                    className="size-8 min-h-8 p-0 text-text-secondary hover:text-brand-primary disabled:cursor-not-allowed"
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
              <p
                role="alert"
                className="mt-1 text-[0.65rem] text-feedback-error"
              >
                {progressMutation.error.message ||
                  "Não foi possível atualizar o progresso."}
              </p>
            )}
          </DetailCard>

          {canRate && (
            <>
              <DetailCard className="min-h-[7.25rem] px-4 py-4 sm:px-5">
                <h2 className="font-heading text-lg leading-tight text-text-secondary">
                  Sua avaliação
                </h2>
                <p className="mt-1 font-interface text-[0.65rem] font-semibold tracking-[0.04em] text-text-muted">
                  Nota
                </p>
                <fieldset className="mt-0.5 flex items-center gap-0.5">
                  <legend className="sr-only">
                    Avaliar livro de uma a cinco estrelas
                  </legend>
                  {starValues.map((star) => (
                    <button
                      key={star}
                      type="button"
                      aria-label={`${star} ${star === 1 ? "estrela" : "estrelas"}`}
                      aria-pressed={entry.rating === star}
                      disabled={updateMutation.isPending}
                      onClick={() =>
                        updateMutation.mutate({
                          id: entry.id,
                          patch: { rating: star },
                        })
                      }
                      className="cursor-pointer rounded-sm text-brand-primary disabled:cursor-not-allowed disabled:opacity-45"
                      title={`Avaliar com ${star} estrelas`}
                    >
                      <Star
                        aria-hidden="true"
                        className="size-[1.1rem]"
                        fill={
                          entry.rating !== null && star <= entry.rating
                            ? "currentColor"
                            : "none"
                        }
                        strokeWidth={1.8}
                      />
                    </button>
                  ))}
                </fieldset>
                {updateMutation.isError && (
                  <p role="alert" className="mt-1 text-xs text-feedback-error">
                    Não foi possível salvar sua avaliação.
                  </p>
                )}
              </DetailCard>

              <DetailCard>
                <h2 className="font-heading text-lg leading-tight">
                  Sua resenha
                </h2>
                <form onSubmit={saveReview} className="mt-3 flex flex-col gap-3">
                  <label htmlFor="book-review" className="sr-only">
                    Resenha do livro
                  </label>
                  <textarea
                    id="book-review"
                    value={reviewDraft}
                    onChange={(event) => setReviewDraft(event.target.value)}
                    rows={4}
                    className="w-full resize-y rounded-field border border-border-default bg-background-canvas px-3 py-2.5 text-sm text-text-primary focus-visible:outline-brand-primary"
                    placeholder="O que você achou deste livro?"
                  />
                  {reviewMutation.isError && (
                    <p role="alert" className="text-sm text-feedback-error">
                      Não foi possível salvar sua resenha.
                    </p>
                  )}
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      loading={reviewMutation.isPending}
                      disabled={
                        reviewDraft.trim() === (entry.review ?? "") &&
                        !reviewMutation.isError
                      }
                    >
                      Salvar resenha
                    </Button>
                  </div>
                </form>
              </DetailCard>
            </>
          )}
        </aside>

        <section aria-labelledby="notes-heading" className="md:col-span-8">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2
              id="notes-heading"
              className="font-heading text-lg leading-tight"
            >
              Anotações
            </h2>
            {canAddNote && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => openNoteDialog()}
                className="min-h-10 gap-1.5 px-2 text-xs font-medium text-brand-primary"
              >
                <Plus aria-hidden="true" className="size-3.5" />
                Nova anotação
              </Button>
            )}
          </div>

          {!canAddNote && (
            <p className="mb-3 text-xs text-text-muted">
              Altere o estado para “Lendo” ou “Lido” para adicionar anotações.
            </p>
          )}

          {entry.notes.length > 0 ? (
            <div className="flex flex-col gap-2.5">
              {visibleNotes.map((note) => (
                <article
                  key={note.id}
                  className="rounded-field border border-border-default/70 border-l-[3px] border-l-brand-primary bg-background-surface px-4 py-3.5 sm:px-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-interface text-[0.65rem] text-text-secondary">
                        Anotação ·{" "}
                        {new Intl.DateTimeFormat("pt-BR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                          .format(new Date(note.createdAt))
                          .replace(".", "")}
                      </p>
                      <p
                        title={note.content}
                        className="mt-2 line-clamp-3 whitespace-pre-wrap font-interface text-xs italic leading-relaxed text-text-primary"
                      >
                        {note.content}
                      </p>
                    </div>
                    {canAddNote && (
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          aria-label="Editar anotação"
                          title="Editar anotação"
                          onClick={() => openNoteDialog(note)}
                          className="size-10 min-h-10 p-0 text-text-secondary hover:text-brand-primary"
                        >
                          <Pencil aria-hidden="true" className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          aria-label="Excluir anotação"
                          title="Excluir anotação"
                          disabled={deleteNoteMutation.isPending}
                          onClick={() => {
                            deleteNoteMutation.reset();
                            setNoteToDelete(note);
                          }}
                          className="size-10 min-h-10 p-0 text-text-secondary hover:text-feedback-error"
                        >
                          <Trash2 aria-hidden="true" className="size-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="rounded-field border border-border-default/50 px-4 py-5 text-sm text-text-muted">
              Nenhuma anotação salva para este livro.
            </p>
          )}

          {notesTotalPages > 1 && (
            <nav
              aria-label="Paginação das anotações"
              className="mt-3 flex flex-wrap items-center justify-between gap-3"
            >
              <p className="font-interface text-xs text-text-secondary">
                {firstVisibleNote}–{lastVisibleNote} de {entry.notes.length}{" "}
                anotações
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  aria-label="Anotações anteriores"
                  disabled={activeNotesPage === 0}
                  onClick={() => setNotesPage(activeNotesPage - 1)}
                  className="size-10 min-h-10 p-0"
                >
                  <ChevronLeft aria-hidden="true" className="size-4" />
                </Button>
                <span
                  aria-live="polite"
                  className="font-interface text-xs tabular-nums text-text-secondary"
                >
                  Página {activeNotesPage + 1} de {notesTotalPages}
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  aria-label="Próximas anotações"
                  disabled={activeNotesPage >= notesTotalPages - 1}
                  onClick={() => setNotesPage(activeNotesPage + 1)}
                  className="size-10 min-h-10 p-0"
                >
                  <ChevronRight aria-hidden="true" className="size-4" />
                </Button>
              </div>
            </nav>
          )}
        </section>
      </div>

      <Dialog
        open={noteDialogOpen}
        onClose={closeNoteDialog}
        title={noteToEdit ? "Editar anotação" : "Nova anotação"}
        size="compact"
      >
        <form onSubmit={saveNote} className="flex flex-col gap-4">
          <label
            htmlFor="book-note"
            className="font-interface text-sm font-semibold text-text-primary"
          >
            Anotação
          </label>
          <textarea
            id="book-note"
            autoFocus
            maxLength={maxNoteLength}
            required
            value={noteContent}
            onChange={(event) => setNoteContent(event.target.value)}
            rows={5}
            className="w-full resize-y rounded-field border border-border-default bg-background-canvas px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus-visible:outline-brand-primary"
            placeholder="Guarde uma ideia ou trecho marcante..."
          />
          <p className="-mt-3 text-right font-interface text-xs text-text-muted">
            {noteContent.length.toLocaleString("pt-BR")} / 10.000 caracteres
          </p>
          {(createNoteMutation.isError || updateNoteMutation.isError) && (
            <p role="alert" className="text-sm text-feedback-error">
              {createNoteMutation.error?.message ||
                updateNoteMutation.error?.message ||
                "Não foi possível salvar a anotação."}
            </p>
          )}
          <div className="flex justify-end gap-2 border-t border-border-default/60 pt-4">
            <Button type="button" variant="secondary" onClick={closeNoteDialog}>
              Cancelar
            </Button>
            <Button
              type="submit"
              loading={
                createNoteMutation.isPending || updateNoteMutation.isPending
              }
              disabled={!noteContent.trim()}
            >
              {noteToEdit ? "Salvar alterações" : "Salvar anotação"}
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={Boolean(noteToDelete)}
        onClose={() => setNoteToDelete(null)}
        title="Excluir anotação?"
        size="compact"
      >
        <div className="flex flex-col gap-4">
          <p className="line-clamp-3 whitespace-pre-wrap text-sm text-text-secondary">
            {noteToDelete?.content}
          </p>
          {deleteNoteMutation.isError && (
            <p role="alert" className="text-sm text-feedback-error">
              {deleteNoteMutation.error.message ||
                "Não foi possível excluir a anotação."}
            </p>
          )}
          <div className="flex justify-end gap-2 border-t border-border-default/60 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setNoteToDelete(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              loading={deleteNoteMutation.isPending}
              disabled={!noteToDelete}
              onClick={() => {
                if (!noteToDelete) return;
                deleteNoteMutation.mutate(noteToDelete.id, {
                  onSuccess: () => setNoteToDelete(null),
                });
              }}
            >
              Excluir anotação
            </Button>
          </div>
        </div>
      </Dialog>
    </PageFrame>
  );
}
