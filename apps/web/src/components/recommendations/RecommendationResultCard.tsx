import type { BookRecommendation } from "@library/contracts";
import { BookPlus, Check, RotateCcw, Sparkles } from "lucide-react";
import { useId } from "react";
import { useAddLibraryEntry } from "../../hooks/useLibrary";
import { bookCoverFallbackUrl } from "../../lib/bookCover";
import { Button } from "../ui/Button";

type RecommendationResultCardProps = {
  recommendation: BookRecommendation;
};

export function RecommendationResultCard({
  recommendation,
}: RecommendationResultCardProps) {
  const titleId = useId();
  const saveMutation = useAddLibraryEntry();
  const { title, author, justification } = recommendation;

  function handleSave() {
    if (saveMutation.isPending || saveMutation.isSuccess) return;

    saveMutation.mutate({
      source: "MANUAL",
      title: title.trim(),
      authors: [author.trim()],
    });
  }

  function handleRetry() {
    const previousInput = saveMutation.variables;
    if (previousInput && !saveMutation.isPending) {
      saveMutation.mutate(previousInput);
    }
  }

  return (
    <article
      aria-labelledby={titleId}
      className="flex min-w-0 flex-col border border-border-default/60 bg-background-canvas p-4 shadow-[0_1px_3px_rgba(47,36,17,0.035)]"
    >
      <div className="mx-auto mb-4 aspect-3/4 w-full max-w-56 overflow-hidden rounded-field bg-background-surface shadow-sm">
        <img
          src={bookCoverFallbackUrl}
          alt={`Capa indisponível para ${title}`}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>

      <div className="flex flex-1 flex-col">
        <h2
          id={titleId}
          className="wrap-break-word font-heading text-xl leading-tight text-text-primary"
        >
          {title}
        </h2>
        <p className="mt-1 wrap-break-word font-interface text-sm text-text-secondary">
          {author}
        </p>

        <section className="mt-4 flex-1 border-l-2 border-brand-primary/45 bg-background-surface/60 px-3 py-2">
          <h3 className="flex items-center gap-1.5 font-interface text-xs font-semibold text-brand-primary">
            <Sparkles aria-hidden="true" className="size-3.5 shrink-0" />
            Por que combina com você
          </h3>
          <p className="mt-2 wrap-break-word font-interface text-sm leading-relaxed text-text-secondary">
            {justification}
          </p>
        </section>

        <div className="mt-4">
          <Button
            type="button"
            loading={saveMutation.isPending}
            disabled={saveMutation.isPending || saveMutation.isSuccess}
            onClick={handleSave}
            className="min-h-11 w-full gap-2 rounded-field px-2 text-xs leading-tight"
          >
            {saveMutation.isSuccess ? (
              <Check aria-hidden="true" className="size-4 shrink-0" />
            ) : (
              <BookPlus aria-hidden="true" className="size-4 shrink-0" />
            )}
            <span>
              {saveMutation.isSuccess
                ? "Na biblioteca · Quero ler"
                : "Adicionar à biblioteca"}
            </span>
          </Button>

          {saveMutation.isSuccess && (
            <p role="status" aria-live="polite" className="sr-only">
              {title} foi adicionado à sua biblioteca como Quero ler.
            </p>
          )}

          {saveMutation.isError && (
            <div className="mt-3 text-center">
              <p
                role="alert"
                className="text-xs leading-relaxed text-feedback-error"
              >
                {saveMutation.error.message}
              </p>
              <Button
                type="button"
                variant="secondary"
                onClick={handleRetry}
                className="mt-2 min-h-11 w-full text-xs"
              >
                <RotateCcw aria-hidden="true" className="size-3.5" />
                Tentar novamente
              </Button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
