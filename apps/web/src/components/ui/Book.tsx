import type { ReadingState } from "@library/contracts";
import { CirclePlus, PencilLine } from "lucide-react";
import type { ComponentProps } from "react";
import BookCover from "../../assets/bookCover.jpg";
import { formatDate } from "../../lib/formatDate";
import { ReadingStatusBadge } from "./ReadingStatusBadge";

type BookProps = Omit<ComponentProps<"article">, "children"> & {
  title: string;
  authors: readonly string[];
  status: ReadingState;
  activityAt: string;
  activityLabel: "Adicionado" | "Atualizado";
  coverUrl?: string | null;
};

export function Book({
  title,
  authors,
  status,
  activityAt,
  activityLabel,
  coverUrl,
  className,
  ...props
}: BookProps) {
  const authorLabel =
    authors.length > 0 ? authors.join(", ") : "Autor desconhecido";

  return (
    <article
      {...props}
      className={`relative aspect-2/3 w-full max-w-56 overflow-hidden rounded-card border border-border-default bg-background-surface ${className ?? ""}`}
    >
      <img
        src={coverUrl || BookCover}
        alt={`Capa de ${title}, por ${authorLabel}`}
        className="absolute inset-0 h-full w-full object-cover"
        onError={(event) => {
          event.currentTarget.onerror = null;
          event.currentTarget.src = BookCover;
        }}
      />

      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-black/90 via-black/65 to-transparent"
      />

      <ReadingStatusBadge
        status={status}
        appearance="default"
        className="absolute top-3 right-3 z-10"
      />

      <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-1.5 p-4 text-white">
        <h3 className="line-clamp-2 font-heading text-xl leading-tight font-medium drop-shadow-sm">
          {title}
        </h3>
        <p className="line-clamp-1 font-interface text-sm text-white/90">
          {authorLabel}
        </p>
        <div className="mt-1 flex items-center gap-1.5 font-interface text-xs text-white/75">
          {activityLabel === "Adicionado" ? (
            <CirclePlus aria-hidden="true" size={14} />
          ) : (
            <PencilLine aria-hidden="true" size={14} />
          )}
          <span>
            {activityLabel} {formatDate(activityAt)}
          </span>
        </div>
      </div>
    </article>
  );
}
