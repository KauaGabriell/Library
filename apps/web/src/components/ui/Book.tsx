import type { ReadingState } from "@library/contracts";
import { CirclePlus } from "lucide-react";
import type { ComponentProps } from "react";
import BookCover from "../../assets/bookCover.jpg";
import { formatDate } from "../../lib/formatDate";
import { ReadingStatusBadge } from "./ReadingStatusBadge";
import { Text } from "./Text";

type BookProps = Omit<ComponentProps<"article">, "children"> & {
  title: string;
  authors: readonly string[];
  status: ReadingState;
  addedAt: string;
  coverUrl?: string | null;
};

export function Book({
  title,
  authors,
  status,
  addedAt,
  coverUrl,
  className,
  ...props
}: BookProps) {
  const authorLabel =
    authors.length > 0 ? authors.join(", ") : "Autor desconhecido";

  return (
    <article
      {...props}
      className={`flex w-full max-w-56 flex-col gap-2 ${className ?? ""}`}
    >
      <div className="relative aspect-2/3 w-full overflow-hidden rounded-md bg-background-subtle">
        <img
          src={coverUrl || BookCover}
          alt={`Capa de ${title}, por ${authorLabel}`}
          className="h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = BookCover;
          }}
        />
        <ReadingStatusBadge
          status={status}
          className="absolute right-3 top-3"
        />
      </div>

      <div className="flex flex-col gap-1">
        <h3 className="m-0">
          <Text variant="headingLarge" className="line-clamp-2">
            {title}
          </Text>
        </h3>
        <Text variant="bodyMd" tone="secondary" className="line-clamp-1">
          {authorLabel}
        </Text>
        <div className="flex items-center gap-1 text-text-muted">
          <CirclePlus aria-hidden="true" size={16} />
          <Text variant="metadata" tone="muted">
            Adicionado {formatDate(addedAt)}
          </Text>
        </div>
      </div>
    </article>
  );
}
