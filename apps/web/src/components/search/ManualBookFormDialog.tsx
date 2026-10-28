import type { LibraryEntryCreateInput } from "@library/contracts";
import { type FormEvent, useEffect, useState } from "react";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";
import { Input } from "../ui/Input";

type ManualBookInput = Extract<LibraryEntryCreateInput, { source: "MANUAL" }>;

type ManualBookFormDialogProps = {
  open: boolean;
  initialTitle: string;
  pending?: boolean;
  error?: string;
  onClose: () => void;
  onSubmit: (input: ManualBookInput) => void;
  onRetry?: () => void;
};

export function ManualBookFormDialog({
  open,
  initialTitle,
  pending = false,
  error,
  onClose,
  onSubmit,
  onRetry,
}: ManualBookFormDialogProps) {
  const [title, setTitle] = useState(initialTitle);

  useEffect(() => {
    if (open) setTitle(initialTitle);
  }, [initialTitle, open]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const trimmedTitle = String(formData.get("title") ?? "").trim();
    if (!trimmedTitle) return;

    const authors = String(formData.get("authors") ?? "")
      .split(",")
      .map((author) => author.trim())
      .filter(Boolean);
    const description = String(formData.get("description") ?? "").trim();
    const coverUrl = String(formData.get("coverUrl") ?? "").trim();
    const language = String(formData.get("language") ?? "").trim();
    const pageCountValue = String(formData.get("pageCount") ?? "");
    const pageCount = pageCountValue ? Number(pageCountValue) : undefined;

    onSubmit({
      source: "MANUAL",
      title: trimmedTitle,
      authors,
      ...(description ? { description } : {}),
      ...(coverUrl ? { coverUrl } : {}),
      ...(language ? { language } : {}),
      ...(pageCount === undefined ? {} : { pageCount }),
    });
  }

  return (
    <Dialog open={open} onClose={onClose} title="Adicionar livro manualmente">
      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        <Input
          label="Título"
          name="title"
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <Input
          label="Autores"
          name="authors"
          placeholder="Separe vários autores por vírgula"
        />
        <div className="flex flex-col gap-2">
          <label
            htmlFor="manual-book-description"
            className="text-sm font-semibold text-text-primary"
          >
            Descrição
          </label>
          <textarea
            id="manual-book-description"
            name="description"
            rows={4}
            className="w-full rounded-field border border-border-control bg-background-surface px-3 py-2 text-body-sm text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
          />
        </div>
        <Input label="URL da capa" name="coverUrl" type="url" />
        <div className="grid gap-5 sm:grid-cols-2">
          <Input label="Idioma" name="language" />
          <Input
            label="Número de páginas"
            name="pageCount"
            type="number"
            min={1}
            step={1}
          />
        </div>
        {error && (
          <div className="flex flex-col gap-3" role="alert">
            <p className="text-body-sm text-feedback-error">{error}</p>
            {onRetry && (
              <Button type="button" variant="secondary" onClick={onRetry}>
                Tentar novamente
              </Button>
            )}
          </div>
        )}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button type="submit" loading={pending}>
            Adicionar livro
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
