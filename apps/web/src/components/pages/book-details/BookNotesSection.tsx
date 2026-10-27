import type { LibraryEntryDetailsPublicResponse } from "@library/contracts";
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { type FormEvent, useRef, useState } from "react";
import {
  useCreateLibraryNote,
  useDeleteLibraryNote,
  useUpdateLibraryNote,
} from "../../../hooks/useLibrary";
import { Button } from "../../ui/Button";
import { Dialog } from "../../ui/Dialog";

type BookNote = LibraryEntryDetailsPublicResponse["notes"][number];

type BookNotesSectionProps = {
  libraryId: string;
  notes: LibraryEntryDetailsPublicResponse["notes"];
  canAddNote: boolean;
};

const notesPerPage = 2;
const maxNoteLength = 10_000;

export function BookNotesSection({
  libraryId,
  notes,
  canAddNote,
}: BookNotesSectionProps) {
  const createNoteMutation = useCreateLibraryNote(libraryId);
  const updateNoteMutation = useUpdateLibraryNote();
  const deleteNoteMutation = useDeleteLibraryNote();
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [noteToEdit, setNoteToEdit] = useState<BookNote | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<BookNote | null>(null);
  const [noteContent, setNoteContent] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const createButtonRef = useRef<HTMLButtonElement>(null);
  const [notesPage, setNotesPage] = useState(0);
  const notesTotalPages = Math.ceil(notes.length / notesPerPage);
  const activeNotesPage = Math.min(notesPage, Math.max(0, notesTotalPages - 1));
  const visibleNotes = notes.slice(
    activeNotesPage * notesPerPage,
    (activeNotesPage + 1) * notesPerPage,
  );
  const firstVisibleNote = activeNotesPage * notesPerPage + 1;
  const lastVisibleNote = Math.min(
    (activeNotesPage + 1) * notesPerPage,
    notes.length,
  );

  function closeNoteDialog() {
    setNoteDialogOpen(false);
    setNoteToEdit(null);
    setNoteContent("");
    createNoteMutation.reset();
    updateNoteMutation.reset();
  }

  function openNoteDialog(note?: BookNote) {
    setStatusMessage("");
    setNoteToEdit(note ?? null);
    setNoteContent(note?.content ?? "");
    createNoteMutation.reset();
    updateNoteMutation.reset();
    setNoteDialogOpen(true);
  }

  function saveNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = noteContent.trim();

    if (!content || content.length > maxNoteLength) return;

    if (noteToEdit) {
      updateNoteMutation.mutate(
        { noteId: noteToEdit.id, content },
        {
          onSuccess: () => {
            setStatusMessage("Anotação atualizada.");
            closeNoteDialog();
          },
        },
      );
      return;
    }

    createNoteMutation.mutate(content, {
      onSuccess: () => {
        setNotesPage(0);
        setStatusMessage("Anotação salva.");
        closeNoteDialog();
      },
    });
  }

  return (
    <>
      <section aria-labelledby="notes-heading" className="md:col-span-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 id="notes-heading" className="font-heading text-lg leading-tight">
            Anotações
          </h2>
          {canAddNote && (
            <Button
              type="button"
              variant="ghost"
              ref={createButtonRef}
              onClick={() => openNoteDialog()}
              className="min-h-11 gap-1.5 px-2 text-xs font-medium text-brand-primary"
            >
              <Plus aria-hidden="true" className="size-3.5" />
              Nova anotação
            </Button>
          )}
        </div>
        <p role="status" aria-live="polite" className="sr-only">
          {statusMessage}
        </p>

        {!canAddNote && (
          <p className="mb-3 text-xs text-text-muted">
            Altere o estado para “Lendo” ou “Lido” para adicionar anotações.
          </p>
        )}

        {notes.length > 0 ? (
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
                        className="size-11 min-h-11 p-0 text-text-secondary hover:text-brand-primary"
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
                        className="size-11 min-h-11 p-0 text-text-secondary hover:text-feedback-error"
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
              {firstVisibleNote}–{lastVisibleNote} de {notes.length} anotações
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                aria-label="Anotações anteriores"
                disabled={activeNotesPage === 0}
                onClick={() => setNotesPage(activeNotesPage - 1)}
                className="size-11 min-h-11 p-0"
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
                className="size-11 min-h-11 p-0"
              >
                <ChevronRight aria-hidden="true" className="size-4" />
              </Button>
            </div>
          </nav>
        )}
      </section>

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
            className="w-full resize-y rounded-field border border-border-control bg-background-canvas px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus-visible:outline-brand-primary"
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
                  onSuccess: () => {
                    setStatusMessage("Anotação excluída.");
                    setNoteToDelete(null);
                    window.requestAnimationFrame(() =>
                      createButtonRef.current?.focus(),
                    );
                  },
                });
              }}
            >
              Excluir anotação
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
