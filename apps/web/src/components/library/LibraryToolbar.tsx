import type { ReadingState } from "@library/contracts";
import { Grid2X2, List, Plus } from "lucide-react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";

export type LibraryView = "table" | "cards";

type StatusCounts = Record<ReadingState, number>;

type LibraryToolbarProps = {
  search: string;
  status?: ReadingState;
  sortBy: "updatedAt" | "createdAt";
  counts: StatusCounts;
  view: LibraryView;
  onSearchChange: (value: string) => void;
  onStatusChange: (status?: ReadingState) => void;
  onSortChange: (sortBy: "updatedAt" | "createdAt") => void;
  onViewChange: (view: LibraryView) => void;
  onAddBook: () => void;
};

export function LibraryToolbar({
  search,
  status,
  sortBy,
  counts,
  view,
  onSearchChange,
  onStatusChange,
  onSortChange,
  onViewChange,
  onAddBook,
}: LibraryToolbarProps) {
  return (
    <section
      aria-label="Filtros da biblioteca"
      className="grid min-w-0 gap-4 rounded-card border border-border-default/55 bg-background-surface p-4 md:grid-cols-2 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,0.9fr)] lg:items-end"
    >
      <div className="min-w-0">
        <Input
          label="Buscar na biblioteca"
          type="search"
          value={search}
          placeholder="Título"
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>

      <div className="min-w-0">
        <Select
          label="Filtrar por status"
          value={status ?? "ALL"}
          onChange={(event) =>
            onStatusChange(
              event.target.value === "ALL"
                ? undefined
                : (event.target.value as ReadingState),
            )
          }
        >
          <option value="ALL">Todos os status</option>
          <option value="WANT_TO_READ">
            Quero ler ({counts.WANT_TO_READ})
          </option>
          <option value="READING">Lendo ({counts.READING})</option>
          <option value="READ">Lido ({counts.READ})</option>
        </Select>
      </div>

      <div className="min-w-0">
        <Select
          label="Ordenar por"
          value={sortBy}
          onChange={(event) =>
            onSortChange(event.target.value as "updatedAt" | "createdAt")
          }
        >
          <option value="updatedAt">Atualizados recentemente</option>
          <option value="createdAt">Adicionados recentemente</option>
        </Select>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 lg:col-span-3">
        <div className="hidden items-center gap-1 lg:flex">
          <Button
            type="button"
            variant="secondary"
            aria-label="Visualização em tabela"
            aria-pressed={view === "table"}
            onClick={() => onViewChange("table")}
            className={
              view === "table"
                ? "border-brand-primary text-brand-primary"
                : "px-3"
            }
          >
            <List aria-hidden="true" className="size-4" />
            Tabela
          </Button>
          <Button
            type="button"
            variant="secondary"
            aria-label="Visualização em cards"
            aria-pressed={view === "cards"}
            onClick={() => onViewChange("cards")}
            className={
              view === "cards"
                ? "border-brand-primary text-brand-primary"
                : "px-3"
            }
          >
            <Grid2X2 aria-hidden="true" className="size-4" />
            Cards
          </Button>
        </div>
        <Button type="button" onClick={onAddBook} className="gap-2">
          <Plus aria-hidden="true" className="size-4" />
          Adicionar livro
        </Button>
      </div>
    </section>
  );
}
