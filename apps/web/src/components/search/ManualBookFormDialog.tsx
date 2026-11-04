import type { LibraryEntryCreateInput } from "@library/contracts";
import { type FormEvent, useEffect, useId, useRef, useState } from "react";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";
import { Input } from "../ui/Input";

type ManualBookInput = Extract<LibraryEntryCreateInput, { source: "MANUAL" }>;

type ManualBookFormDialogProps = {
  open: boolean;
  initialTitle: string;
  initialAuthors?: readonly string[];
  pending?: boolean;
  error?: string;
  onClose: () => void;
  onSubmit: (input: ManualBookInput) => void;
  onRetry?: () => void;
};

export function ManualBookFormDialog({
  open,
  initialTitle,
  initialAuthors,
  pending = false,
  error,
  onClose,
  onSubmit,
  onRetry,
}: ManualBookFormDialogProps) {
  const initialAuthorText = initialAuthors?.join(", ") ?? "";
  const [title, setTitle] = useState(initialTitle);
  const [authorsText, setAuthorsText] = useState(initialAuthorText);
  const [titleError, setTitleError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const descriptionId = useId();

  useEffect(() => {
    if (open) {
      formRef.current?.reset();
      setTitle(initialTitle);
      setAuthorsText(initialAuthorText);
      setTitleError("");
    }
  }, [initialTitle, initialAuthorText, open]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const trimmedTitle = String(formData.get("title") ?? "").trim();
    if (!trimmedTitle) {
      setTitleError("Informe um título válido para continuar.");
      formRef.current
        ?.querySelector<HTMLInputElement>('[name="title"]')
        ?.focus();
      return;
    }

    setTitleError("");

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
      <form
        ref={formRef}
        className="flex flex-col gap-5"
        onSubmit={handleSubmit}
      >
        <fieldset disabled={pending} className="flex min-w-0 flex-col gap-5">
          <Input
            label="Título"
            variant="modal"
            name="title"
            required
            error={titleError}
            value={title}
            onChange={(event) => {
              const nextTitle = event.target.value;
              setTitle(nextTitle);
              if (nextTitle.trim()) setTitleError("");
            }}
          />
          <Input
            label="Autores"
            variant="modal"
            name="authors"
            value={authorsText}
            onChange={(event) => setAuthorsText(event.target.value)}
            placeholder="Separe vários autores por vírgula"
          />
          <div className="flex flex-col gap-2">
            <label
              htmlFor={descriptionId}
              className="text-sm font-semibold text-text-primary"
            >
              Descrição
            </label>
            <textarea
              id={descriptionId}
              name="description"
              rows={4}
              className="w-full rounded-field border border-border-control bg-background-surface px-3 py-2 text-body-sm text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
            />
          </div>
          <Input
            label="URL da capa"
            variant="modal"
            name="coverUrl"
            type="url"
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <Input label="Idioma" variant="modal" name="language" />
            <Input
              label="Número de páginas"
              variant="modal"
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
        </fieldset>
      </form>
    </Dialog>
  );
}
