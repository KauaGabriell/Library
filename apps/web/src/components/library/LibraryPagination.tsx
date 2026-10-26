import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "../ui/Button";

type LibraryPaginationProps = {
  page: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
};

export function LibraryPagination({
  page,
  totalPages,
  totalItems,
  onPageChange,
}: LibraryPaginationProps) {
  return (
    <nav
      aria-label="Paginação da biblioteca"
      className="flex flex-wrap items-center justify-between gap-4"
    >
      <p aria-live="polite" className="text-body-sm text-text-secondary">
        {totalItems} {totalItems === 1 ? "livro" : "livros"} encontrados ·
        Página {page} de {totalPages}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          aria-label="Página anterior"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="size-11 p-0"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
        </Button>
        <Button
          type="button"
          variant="secondary"
          aria-label="Próxima página"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="size-11 p-0"
        >
          <ArrowRight aria-hidden="true" className="size-4" />
        </Button>
      </div>
    </nav>
  );
}
