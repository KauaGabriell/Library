import type { LibraryEntryDetailsPublicResponse } from "@library/contracts";
import { Star } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { useUpdateLibraryEntry } from "../../../hooks/useLibrary";
import { Button } from "../../ui/Button";
import { BookDetailsCard } from "./BookDetailsCard";

type BookReviewSectionProps = {
  entry: LibraryEntryDetailsPublicResponse;
};

const starValues = [1, 2, 3, 4, 5] as const;

export function BookReviewSection({ entry }: BookReviewSectionProps) {
  const ratingMutation = useUpdateLibraryEntry();
  const reviewMutation = useUpdateLibraryEntry();
  const [reviewDraft, setReviewDraft] = useState(entry.review ?? "");
  const [reviewStatusMessage, setReviewStatusMessage] = useState("");
  const [ratingStatusMessage, setRatingStatusMessage] = useState("");

  useEffect(() => {
    setReviewDraft(entry.review ?? "");
  }, [entry.review]);

  function saveReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (entry.status !== "READ") return;

    setReviewStatusMessage("");
    const review = reviewDraft.trim();
    reviewMutation.mutate(
      {
        id: entry.id,
        patch: { review: review || null },
      },
      {
        onSuccess: () => setReviewStatusMessage("Resenha salva."),
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
              aria-label={`${star} ${star === 1 ? "estrela" : "estrelas"}`}
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
        <h2 className="font-heading text-lg leading-tight">Sua resenha</h2>
        <form onSubmit={saveReview} className="mt-3 flex flex-col gap-3">
          <label htmlFor="book-review" className="sr-only">
            Resenha do livro
          </label>
          <textarea
            id="book-review"
            value={reviewDraft}
            onChange={(event) => setReviewDraft(event.target.value)}
            rows={4}
            className="w-full resize-y rounded-field border border-border-control bg-background-canvas px-3 py-2.5 text-sm text-text-primary focus-visible:outline-brand-primary"
            placeholder="O que você achou deste livro?"
          />
          {reviewMutation.isError && (
            <p role="alert" className="text-sm text-feedback-error">
              Não foi possível salvar sua resenha.
            </p>
          )}
          <p role="status" aria-live="polite" className="sr-only">
            {reviewStatusMessage}
          </p>
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
      </BookDetailsCard>
    </>
  );
}
