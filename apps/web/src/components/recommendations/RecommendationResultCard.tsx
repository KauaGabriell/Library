import type {
  BookRecommendation,
  LibraryEntryCreateInput,
} from "@library/contracts";
import { BookPlus, Check, ExternalLink, Sparkles } from "lucide-react";
import { useId, useState } from "react";
import { useAddLibraryEntry } from "../../hooks/useLibrary";
import { ManualBookFormDialog } from "../search/ManualBookFormDialog";
import { Button } from "../ui/Button";

type ManualBookInput = Extract<LibraryEntryCreateInput, { source: "MANUAL" }>;
type RecommendationResultCardProps = { recommendation: BookRecommendation };

export function RecommendationResultCard({
  recommendation,
}: RecommendationResultCardProps) {
  const titleId = useId();
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const saveMutation = useAddLibraryEntry();
  const { title, author, justification } = recommendation;
  const searchUrl = new URL("https://www.google.com/search");
  searchUrl.searchParams.set("q", [title, author, "livro"].join(" "));

  function openManualForm() {
    if (saveMutation.isPending || saveMutation.isSuccess) return;
    saveMutation.reset();
    setManualDialogOpen(true);
  }

  function closeManualForm() {
    if (saveMutation.isPending) return;
    setManualDialogOpen(false);
    saveMutation.reset();
  }

  function saveManualBook(input: ManualBookInput, coverFile?: File) {
    if (saveMutation.isPending || saveMutation.isSuccess) return;
    saveMutation.mutate(
      { input, ...(coverFile ? { coverFile } : {}) },
      { onSuccess: () => setManualDialogOpen(false) },
    );
  }

  function retrySave() {
    const previous = saveMutation.variables;
    if (previous?.input.source === "MANUAL") {
      saveManualBook(previous.input, previous.coverFile);
    }
  }

  return (
    <article
      aria-labelledby={titleId}
      className="flex min-w-0 flex-col rounded-field border border-border-default bg-background-canvas p-5 sm:p-6"
    >
      <p className="mb-5 font-interface text-xs font-semibold uppercase tracking-widest text-brand-primary">
        Sugestão de leitura
      </p>
      <h2
        id={titleId}
        className="wrap-break-word font-heading text-2xl leading-tight text-text-primary"
      >
        {title}
      </h2>
      <p className="mt-2 wrap-break-word font-interface text-sm text-text-secondary">
        {author}
      </p>
      <section className="mt-6 flex-1 border-t border-border-default/60 pt-5">
        <h3 className="flex items-center gap-2 font-interface text-xs font-semibold text-brand-primary">
          <Sparkles aria-hidden="true" className="size-4 shrink-0" />
          Por que combina com você
        </h3>
        <p className="mt-3 wrap-break-word font-interface text-sm leading-relaxed text-text-secondary">
          {justification}
        </p>
      </section>
      <div className="mt-6 flex flex-col gap-3">
        <a
          href={searchUrl.toString()}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-field border border-border-control px-3 py-2 font-interface text-sm text-brand-primary transition-colors hover:bg-background-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary motion-reduce:transition-none"
        >
          Pesquisar livro
          <ExternalLink aria-hidden="true" className="size-4 shrink-0" />
          <span className="sr-only"> (abre em nova aba)</span>
        </a>
        <Button
          type="button"
          disabled={saveMutation.isPending || saveMutation.isSuccess}
          onClick={openManualForm}
          className="min-h-11 w-full gap-2 rounded-field px-3 text-sm"
        >
          {saveMutation.isSuccess ? (
            <Check aria-hidden="true" className="size-4 shrink-0" />
          ) : (
            <BookPlus aria-hidden="true" className="size-4 shrink-0" />
          )}
          {saveMutation.isSuccess
            ? "Na biblioteca · Quero ler"
            : "Adicionar manualmente"}
        </Button>
        {saveMutation.isSuccess && (
          <p role="status" aria-live="polite" className="sr-only">
            {saveMutation.variables?.input.source === "MANUAL"
              ? saveMutation.variables.input.title
              : title}{" "}
            foi adicionado à sua biblioteca como Quero ler.
          </p>
        )}
      </div>
      <ManualBookFormDialog
        open={manualDialogOpen}
        initialTitle={title}
        initialAuthors={[author]}
        pending={saveMutation.isPending}
        error={saveMutation.isError ? saveMutation.error.message : undefined}
        onClose={closeManualForm}
        onSubmit={saveManualBook}
        onRetry={retrySave}
      />
    </article>
  );
}
