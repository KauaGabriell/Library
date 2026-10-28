import type { LibraryEntryDetailsPublicResponse } from "@library/contracts";
import { Check, Pencil, Plus, Star, Trash2, X } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { useUpdateLibraryEntry } from "../../../hooks/useLibrary";
import { Button } from "../../ui/Button";
import { Dialog } from "../../ui/Dialog";
import { BookDetailsCard } from "./BookDetailsCard";

type BookReviewSectionProps = {
  entry: LibraryEntryDetailsPublicResponse;
};

const starValues = [1, 2, 3, 4, 5] as const;

export function BookReviewSection({ entry }: BookReviewSectionProps) {
  const ratingMutation = useUpdateLibraryEntry();
  const reviewMutation = useUpdateLibraryEntry();
  const [reviewDraft, setReviewDraft] = useState(entry.review ?? "");
  const [isEditingReview, setIsEditingReview] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [reviewStatusMessage, setReviewStatusMessage] = useState("");
  const [ratingStatusMessage, setRatingStatusMessage] = useState("");
  const reviewActionRef = useRef<HTMLButtonElement>(null);
  const reviewInputRef = useRef<HTMLTextAreaElement>(null);
  const wasEditingReviewRef = useRef(false);

  useEffect(() => {
    setReviewDraft(entry.review ?? "");
  }, [entry.review]);

  useEffect(() => {
    if (isEditingReview) {
      reviewInputRef.current?.focus();
    } else if (wasEditingReviewRef.current) {
      reviewActionRef.current?.focus();
    }

    wasEditingReviewRef.current = isEditingReview;
  }, [isEditingReview]);

  function openReviewEditor() {
    reviewMutation.reset();
    setReviewStatusMessage("");
    setReviewDraft(entry.review ?? "");
    setIsEditingReview(true);
  }

  function cancelReviewEditor() {
    setReviewDraft(entry.review ?? "");
    reviewMutation.reset();
    setIsEditingReview(false);
  }

  function saveReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const review = reviewDraft.trim();

    if (entry.status !== "READ" || !review) return;

    setReviewStatusMessage("");
    reviewMutation.mutate(
      { id: entry.id, patch: { review } },
      {
        onSuccess: () => {
          setReviewDraft(review);
          setReviewStatusMessage("Resenha salva.");
          setIsEditingReview(false);
        },
      },
    );
  }

  function deleteReview() {
    if (!entry.review || entry.status !== "READ") return;

    reviewMutation.mutate(
      { id: entry.id, patch: { review: null } },
      {
        onSuccess: () => {
          setReviewDraft("");
          setReviewStatusMessage("Resenha excluída.");
          setIsDeleteDialogOpen(false);
          window.requestAnimationFrame(() => reviewActionRef.current?.focus());
        },
      },
    );
  }

  if (entry.status !== "READ") return null;

  return (
    <>
      <BookDetailsCard className="min-h-29 px-4 py-4 sm:px-5">
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
              aria-label={star + (star === 1 ? " estrela" : " estrelas")}
              aria-pressed={entry.rating === star}
              disabled={ratingMutation.isPending}
              onClick={() => {
                setRatingStatusMessage("");
                ratingMutation.mutate(
                  {
                    id: entry.id,
                    patch: { rating: star },
                  },
                  {
                    onSuccess: () =>
                      setRatingStatusMessage(`Avaliação ${star} de 5 salva.`),
                  },
                );
              }}
              className="inline-flex size-11 items-center justify-center rounded-sm text-brand-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary disabled:cursor-not-allowed disabled:opacity-45"
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
        {ratingMutation.isError && (
          <p role="alert" className="mt-1 text-xs text-feedback-error">
            Não foi possível salvar sua avaliação.
          </p>
        )}
        <p role="status" aria-live="polite" className="sr-only">
          {ratingStatusMessage}
        </p>
      </BookDetailsCard>

      <BookDetailsCard>
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-heading text-lg leading-tight">Sua resenha</h2>
          {!isEditingReview && entry.review && (
            <div className="flex shrink-0 items-center gap-2">
              <Button
                ref={reviewActionRef}
                type="button"
                variant="ghost"
                aria-label="Editar resenha"
                title="Editar resenha"
                onClick={openReviewEditor}
                className="size-11 min-h-11 p-0 text-text-secondary hover:text-brand-primary"
              >
                <Pencil aria-hidden="true" className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                aria-label="Excluir resenha"
                title="Excluir resenha"
                onClick={() => {
                  reviewMutation.reset();
                  setIsDeleteDialogOpen(true);
                }}
                className="size-11 min-h-11 p-0 text-text-secondary hover:text-feedback-error"
              >
                <Trash2 aria-hidden="true" className="size-4" />
              </Button>
            </div>
          )}
        </div>

        {isEditingReview ? (
          <form onSubmit={saveReview} className="mt-3 flex flex-col gap-3">
            <label
              htmlFor="book-review"
              className="font-interface text-sm font-semibold text-text-primary"
            >
              Resenha do livro
            </label>
            <textarea
              id="book-review"
              ref={reviewInputRef}
              value={reviewDraft}
              onChange={(event) => setReviewDraft(event.target.value)}
              rows={4}
              className="w-full resize-y rounded-field border border-border-control bg-background-canvas px-3 py-2.5 text-sm text-text-primary focus-visible:outline-brand-primary"
              placeholder="O que você achou deste livro?"
            />
            {reviewMutation.isError && (
              <p role="alert" className="text-sm text-feedback-error">
                {reviewMutation.error.message ||
                  "Não foi possível salvar sua resenha. Tente novamente."}
              </p>
            )}
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border-default/60 pt-3">
              <Button
                type="button"
                variant="secondary"
                disabled={reviewMutation.isPending}
                onClick={cancelReviewEditor}
              >
                <X aria-hidden="true" className="size-4" />
                Cancelar
              </Button>
              <Button
                type="submit"
                loading={reviewMutation.isPending}
                disabled={
                  !reviewDraft.trim() ||
                  (!reviewMutation.isError &&
                    reviewDraft.trim() === (entry.review ?? ""))
                }
              >
                <Check aria-hidden="true" className="size-4" />
                Salvar resenha
              </Button>
            </div>
          </form>
        ) : entry.review ? (
          <p className="mt-3 whitespace-pre-wrap font-interface text-sm leading-relaxed text-text-secondary">
            {entry.review}
          </p>
        ) : (
          <div className="mt-3">
            <p className="font-interface text-sm text-text-secondary">
              Nenhuma resenha salva.
            </p>
            <Button
              ref={reviewActionRef}
              type="button"
              variant="secondary"
              onClick={openReviewEditor}
              className="mt-3"
            >
              <Plus aria-hidden="true" className="size-4" />
              Escrever resenha
            </Button>
          </div>
        )}

        {!isEditingReview && (
          <p role="status" aria-live="polite" className="sr-only">
            {reviewStatusMessage}
          </p>
        )}
      </BookDetailsCard>

      <Dialog
        open={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        title="Excluir resenha?"
        size="compact"
      >
        <div className="flex flex-col gap-4">
          <p className="whitespace-pre-wrap text-sm text-text-secondary">
            Esta ação removerá sua resenha salva. A avaliação em estrelas será
            mantida.
          </p>
          {reviewMutation.isError && (
            <p role="alert" className="text-sm text-feedback-error">
              {reviewMutation.error.message ||
                "Não foi possível excluir sua resenha. Tente novamente."}
            </p>
          )}
          <div className="flex justify-end gap-2 border-t border-border-default/60 pt-4">
            <Button
              type="button"
              variant="secondary"
              disabled={reviewMutation.isPending}
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              loading={reviewMutation.isPending}
              onClick={deleteReview}
            >
              <Trash2 aria-hidden="true" className="size-4" />
              Excluir resenha
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
