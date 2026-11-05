import {
  BOOK_COVER_MAX_SIZE_BYTES,
  BOOK_COVER_MIME_TYPES,
} from "@library/contracts";
import { ImageUp } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "../ui/Button";

type BookCoverUploadFieldProps = {
  file: File | null;
  disabled?: boolean;
  error?: string;
  onChange: (file: File | null) => void;
  onErrorChange: (message: string) => void;
};

export function BookCoverUploadField({
  file,
  disabled = false,
  error,
  onChange,
  onErrorChange,
}: BookCoverUploadFieldProps) {
  const inputId = useId();
  const helpId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl(nextPreviewUrl);
    return () => URL.revokeObjectURL(nextPreviewUrl);
  }, [file]);

  function handleChange(selectedFile: File | null) {
    if (!selectedFile) return;

    if (selectedFile.size > BOOK_COVER_MAX_SIZE_BYTES) {
      onChange(null);
      onErrorChange("A imagem deve ter no máximo 5 MB.");
      return;
    }

    if (
      !BOOK_COVER_MIME_TYPES.includes(
        selectedFile.type as (typeof BOOK_COVER_MIME_TYPES)[number],
      )
    ) {
      onChange(null);
      onErrorChange("Selecione uma imagem JPEG, PNG ou WebP.");
      return;
    }

    onErrorChange("");
    onChange(selectedFile);
  }

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={inputId}
        className="text-sm font-semibold text-text-primary"
      >
        Arquivo da capa
      </label>
      <div className="flex min-h-12 flex-wrap items-center gap-3 rounded-field border border-border-control bg-background-surface p-2">
        <Button
          type="button"
          variant="secondary"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          <ImageUp aria-hidden="true" className="size-4" />
          Selecionar imagem
        </Button>
        <span
          className="min-w-0 flex-1 truncate text-sm text-text-secondary"
          aria-live="polite"
        >
          {file?.name ?? "Nenhum arquivo selecionado"}
        </span>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={BOOK_COVER_MIME_TYPES.join(",")}
          disabled={disabled}
          tabIndex={-1}
          aria-describedby={helpId}
          aria-invalid={Boolean(error)}
          className="sr-only"
          onChange={(event) =>
            handleChange(event.currentTarget.files?.[0] ?? null)
          }
        />
      </div>
      <p id={helpId} className="text-xs text-text-secondary">
        Selecione uma imagem JPEG, PNG ou WebP, com até 5 MB.
      </p>
      {error && (
        <p role="alert" className="text-sm text-feedback-error">
          {error}
        </p>
      )}
      {previewUrl && (
        <img
          src={previewUrl}
          alt="Prévia da capa"
          className="max-h-48 w-auto self-start rounded-sm border border-border-default object-contain"
        />
      )}
    </div>
  );
}
