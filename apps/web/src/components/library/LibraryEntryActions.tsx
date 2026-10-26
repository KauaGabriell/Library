import type {
  LibraryEntryPublicResponse,
  ReadingState,
} from "@library/contracts";
import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  useDeleteLibraryEntry,
  useUpdateLibraryEntry,
} from "../../hooks/useLibrary";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";
import { ErrorState } from "../ui/ErrorState";
import { Select } from "../ui/Select";

const readingStateLabels: Record<ReadingState, string> = {
  WANT_TO_READ: "Quero ler",
  READING: "Lendo",
  READ: "Lido",
};

type LibraryEntryActionsProps = {
  entry: LibraryEntryPublicResponse;
  variant?: "card" | "table" | "detail";
  onDeleteSuccess?: () => void;
};

export function LibraryEntryActions({
  entry,
  variant = "card",
  onDeleteSuccess,
}: LibraryEntryActionsProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(entry.status);
  const updateMutation = useUpdateLibraryEntry();
  const deleteMutation = useDeleteLibraryEntry();
  const isUpdating =
    updateMutation.isPending && updateMutation.variables?.id === entry.id;
  const isDeleting =
    deleteMutation.isPending && deleteMutation.variables === entry.id;
  const failedUpdate =
    updateMutation.isError && updateMutation.variables?.id === entry.id
      ? updateMutation.variables
      : undefined;
  const updateErrorMessage = failedUpdate
    ? (updateMutation.error?.message ?? "Não foi possível atualizar o status.")
    : undefined;
  const updateError = Boolean(failedUpdate);
  const deleteError =
    deleteMutation.isError && deleteMutation.variables === entry.id;

  function updateStatus(status: ReadingState) {
    updateMutation.mutate({ id: entry.id, patch: { status } });
  }

  function saveStatus() {
    updateMutation.mutate(
      { id: entry.id, patch: { status: selectedStatus } },
      { onSuccess: () => setEditDialogOpen(false) },
    );
  }

  function retryUpdate(onSuccess?: () => void) {
    if (!failedUpdate) return;

    updateMutation.mutate(failedUpdate, { onSuccess });
  }

  return (
    <div
      className={
        variant !== "card"
          ? "flex items-center justify-end gap-1"
          : "flex min-w-36 flex-col gap-2"
      }
    >
      {variant === "card" ? (
        <Select
          label={`Status de ${entry.book.title}`}
          value={entry.status}
          disabled={isUpdating || isDeleting}
          onChange={(event) => updateStatus(event.target.value as ReadingState)}
          className="min-h-10 px-2 py-1 text-sm"
        >
          {Object.entries(readingStateLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      ) : (
        <Button
          type="button"
          variant="ghost"
          disabled={isUpdating || isDeleting}
          loading={isUpdating}
          onClick={() => {
            setSelectedStatus(entry.status);
            setEditDialogOpen(true);
          }}
          aria-label={`Editar status de ${entry.book.title}`}
          title="Editar status"
          className={
            variant === "detail"
              ? "min-h-9 rounded-field border border-border-default px-3 text-xs text-text-primary hover:bg-background-surface hover:text-brand-primary"
              : "min-h-11 min-w-11 px-0 text-text-secondary hover:text-brand-primary"
          }
        >
          <Pencil aria-hidden="true" className="size-4" />
          {variant === "detail" && (
            <span className="ml-1 hidden sm:inline">Editar estado</span>
          )}
        </Button>
      )}

      <Button
        type="button"
        variant="ghost"
        disabled={isDeleting || isUpdating}
        loading={isDeleting}
        onClick={() => setDeleteDialogOpen(true)}
        aria-label={`Remover ${entry.book.title} da biblioteca`}
        title="Remover livro"
        className={
          variant !== "card"
            ? `min-h-11 min-w-11 px-0 text-feedback-error ${variant === "detail" ? "rounded-field border border-border-default/70" : ""}`
            : "min-h-10 justify-start px-2 text-feedback-error"
        }
      >
        {variant !== "card" ? (
          <Trash2 aria-hidden="true" className="size-4" />
        ) : (
          "Remover"
        )}
      </Button>

      {variant === "card" && updateError && (
        <ErrorState
          message={updateErrorMessage ?? "Não foi possível atualizar o status."}
          onRetry={() => retryUpdate()}
        />
      )}
      {variant !== "card" && (
        <Dialog
          open={editDialogOpen}
          onClose={() => setEditDialogOpen(false)}
          title="Alterar status"
          size="compact"
        >
          <div className="flex flex-col gap-4">
            <p className="font-heading text-lg leading-tight text-text-primary">
              {entry.book.title}
            </p>
            <Select
              label="Novo status"
              value={selectedStatus}
              disabled={isUpdating || isDeleting}
              onChange={(event) =>
                setSelectedStatus(event.target.value as ReadingState)
              }
              className="rounded-field border border-border-default bg-background-canvas px-3"
            >
              {Object.entries(readingStateLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            {updateError && (
              <ErrorState
                message={
                  updateErrorMessage ?? "Não foi possível atualizar o status."
                }
                onRetry={() => retryUpdate(() => setEditDialogOpen(false))}
              />
            )}
            <div className="flex flex-wrap justify-end gap-3 border-t border-border-default/60 pt-4">
              <Button
                type="button"
                variant="secondary"
                disabled={isUpdating}
                onClick={() => setEditDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                loading={isUpdating}
                disabled={isDeleting || selectedStatus === entry.status}
                onClick={saveStatus}
              >
                Salvar status
              </Button>
            </div>
          </div>
        </Dialog>
      )}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        title="Remover livro da biblioteca?"
      >
        <div className="flex flex-col gap-5">
          <p className="text-body-md text-text-secondary">
            “{entry.book.title}” será removido da sua biblioteca.
          </p>
          {deleteError && (
            <ErrorState
              message={deleteMutation.error.message}
              onRetry={() =>
                deleteMutation.mutate(entry.id, {
                  onSuccess: () => {
                    setDeleteDialogOpen(false);
                    onDeleteSuccess?.();
                  },
                })
              }
            />
          )}
          <div className="flex flex-wrap justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              loading={isDeleting}
              onClick={() =>
                deleteMutation.mutate(entry.id, {
                  onSuccess: () => {
                    setDeleteDialogOpen(false);
                    onDeleteSuccess?.();
                  },
                })
              }
            >
              Remover livro
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
