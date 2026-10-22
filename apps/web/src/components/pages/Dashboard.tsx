import type { DashboardSummaryResponse } from "@library/contracts";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Bookmark,
  BookOpen,
  CircleCheck,
  Flag,
  Lightbulb,
  PencilLine,
  Star,
} from "lucide-react";
import { Link } from "react-router";
import BookCover from "../../assets/bookCover.jpg";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { fetcher } from "../../lib/api";
import { ReadingGoalDialog } from "../dashboard/ReadingGoalDialog";
import { Book } from "../ui/Book";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { ErrorState } from "../ui/ErrorState";
import { DashboardSkeleton } from "./DashboardSkeleton";

const statusCardPresentation = {
  WANT_TO_READ: {
    label: "Quero ler",
    icon: Bookmark,
    color: "text-status-want-to-read-foreground",
  },
  READING: {
    label: "Lendo",
    icon: BookOpen,
    color: "text-status-reading-foreground",
  },
  READ: {
    label: "Lido",
    icon: CircleCheck,
    color: "text-status-read-foreground",
  },
} satisfies Record<
  keyof DashboardSummaryResponse["countsByStatus"],
  { label: string; icon: typeof Bookmark; color: string }
>;

function SummaryMetricCard({
  icon: MetricIcon,
  color,
  label,
  value,
}: {
  icon: typeof Bookmark;
  color: string;
  label: string;
  value: number | string;
}) {
  return (
    <Card
      padding="compact"
      className="relative flex min-h-22 flex-col justify-end gap-1 border-border-default/55 bg-white"
    >
      <MetricIcon
        aria-hidden="true"
        className={`absolute top-3.5 right-4 size-4 ${color}`}
      />
      <p className="font-heading text-[2rem] leading-none text-text-primary">
        {value}
      </p>
      <p
        className={`max-w-20 font-interface text-label-caps uppercase ${color}`}
      >
        {label}
      </p>
    </Card>
  );
}

export function Dashboard() {
  const user = useCurrentUser();

  const dashboardQuery = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => fetcher<DashboardSummaryResponse>("/dashboard"),
  });

  if (dashboardQuery.isPending) {
    return <DashboardSkeleton />;
  }

  if (dashboardQuery.isError) {
    return (
      <ErrorState
        message={dashboardQuery.error.message}
        onRetry={() => void dashboardQuery.refetch()}
      />
    );
  }

  const completedBooks = dashboardQuery.data.readingGoal?.completedBooks;
  const targetBooks = dashboardQuery.data.readingGoal?.targetBooks;

  const betterRating = dashboardQuery.data.betterRating;
  const recentEntries = dashboardQuery.data.recentEntries;

  const countsByStatus = dashboardQuery.data.countsByStatus;

  const statusCounts = Object.entries(countsByStatus) as Array<
    [keyof typeof countsByStatus, number]
  >;

  return (
    <div className="mx-auto max-w-272 lg:pt-4">
      <header className="mb-8">
        <h1 className="font-heading text-[2rem] leading-tight font-medium text-text-primary sm:text-[2.5rem]">
          Bem-vindo de volta, {user.data?.name}!
        </h1>
        <p className="mt-1 font-interface text-sm text-text-secondary">
          Veja seu progresso e descubra seus próximos livros
        </p>
      </header>

      <section
        aria-label="Resumo da biblioteca"
        className="grid grid-cols-2 gap-4 xl:grid-cols-4"
      >
        {statusCounts.map(([status, count]) => {
          const presentation = statusCardPresentation[status];

          return (
            <SummaryMetricCard
              key={status}
              icon={presentation.icon}
              color={presentation.color}
              label={presentation.label}
              value={count}
            />
          );
        })}
        <SummaryMetricCard
          icon={Star}
          color="text-amber-600"
          label="Avaliação média"
          value={dashboardQuery.data.averageRating?.toFixed(1) ?? "—"}
        />
      </section>

      <div className="mt-10 grid gap-8 xl:grid-cols-[minmax(0,1.65fr)_minmax(17rem,1fr)] xl:gap-6">
        <section
          aria-labelledby="recent-activity-title"
          className="flex min-h-72 flex-col"
        >
          <div className="flex items-baseline justify-between gap-4">
            <h2
              id="recent-activity-title"
              className="font-heading text-2xl text-text-primary"
            >
              Atividade recente
            </h2>
            <Link
              to="/library"
              className="shrink-0 rounded-sm font-interface text-xs font-semibold tracking-wide text-brand-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
            >
              Ver todas
            </Link>
          </div>

          {dashboardQuery.data.totalBooks === 0 ? (
            <div className="mt-4 flex flex-1 flex-col items-center justify-center gap-3 text-center">
              <p className="font-interface text-sm text-text-secondary">
                Sua biblioteca ainda está vazia.
              </p>
              <Link
                to="/search"
                className="inline-flex min-h-11 items-center justify-center rounded-sm bg-brand-primary px-3 py-2 font-interface text-xs font-semibold text-white transition-colors hover:bg-brand-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary motion-reduce:transition-none"
              >
                Buscar livros
              </Link>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {recentEntries.map((entry) => (
                <Book
                  key={entry.id}
                  coverUrl={entry.book.coverUrl}
                  activityAt={entry.updatedAt}
                  activityLabel={
                    entry.updatedAt === entry.createdAt
                      ? "Adicionado"
                      : "Atualizado"
                  }
                  authors={entry.book.authors ?? ["Autor Desconhecidos"]}
                  status={entry.status}
                  title={entry.book.title}
                />
              ))}
            </div>
          )}
        </section>

        <aside
          aria-label="Destaques da leitura"
          className="flex flex-col gap-4"
        >
          <section className="rounded-card border border-border-default/40 bg-white p-5 shadow-[0_1px_4px_rgba(47,36,17,0.07)]">
            <h2 className="font-interface text-[0.65rem] font-bold tracking-[0.08em] text-text-secondary">
              Melhor avaliado
            </h2>
            {betterRating ? (
              <div className="mt-3 flex items-center gap-4">
                {betterRating.book.coverUrl ? (
                  <img
                    src={betterRating.book.coverUrl}
                    alt={`Capa de ${betterRating.book.title}`}
                    className="aspect-2/3 w-12 shrink-0 rounded-xs bg-background-surface object-cover"
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = BookCover;
                    }}
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className="flex aspect-2/3 w-12 shrink-0 items-center justify-center rounded-xs bg-background-surface text-text-muted"
                  >
                    <BookOpen className="size-5" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-heading text-base leading-tight text-text-primary">
                    {betterRating.book.title}
                  </p>
                  <p className="font-interface text-xs text-text-secondary">
                    {betterRating.book.authors?.join(", ") ||
                      "Autor desconhecido"}
                  </p>
                  <div
                    role="img"
                    aria-label={`${betterRating.rating} de 5 estrelas`}
                    className="mt-1 flex gap-0.5 text-amber-600"
                  >
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        aria-hidden="true"
                        className="size-3"
                        fill={
                          star <= betterRating.rating ? "currentColor" : "none"
                        }
                      />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-3 font-interface text-sm text-text-secondary">
                Nenhum livro avaliado ainda.
              </p>
            )}
          </section>

          {dashboardQuery.data.readingGoal ? (
            <section className="rounded-card border border-border-default/50 bg-background-surface/50 p-5 shadow-[0_1px_4px_rgba(47,36,17,0.07)] md:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 font-heading text-xl leading-tight text-text-primary">
                  <Flag
                    aria-hidden="true"
                    className="size-4 shrink-0 text-brand-primary"
                  />
                  Meta de leitura
                </h2>
                <ReadingGoalDialog
                  mode="edit"
                  initialTargetBooks={
                    dashboardQuery.data.readingGoal.targetBooks
                  }
                  trigger={
                    <Button
                      variant="ghost"
                      className="min-h-11 shrink-0 gap-2 px-3 text-xs"
                    >
                      <PencilLine aria-hidden="true" className="size-4" />
                      Editar meta
                    </Button>
                  }
                />
              </div>
              <p className="mt-2 font-heading text-3xl leading-none text-text-primary">
                {completedBooks}{" "}
                <span className="text-lg text-text-muted">
                  de {targetBooks}
                </span>
              </p>
              <p className="mt-1 font-interface text-xs text-text-secondary">
                livros este ano
              </p>
              <div
                role="progressbar"
                aria-label="Progresso da meta de leitura"
                aria-valuenow={dashboardQuery.data.readingGoal?.progressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                className={`mt-4 h-1.5 overflow-hidden rounded-full bg-border-default/35`}
              >
                <div
                  className="h-full w-1/3 rounded-full bg-brand-primary transition-[width]"
                  style={{
                    width: `${dashboardQuery.data.readingGoal?.progressPercent}%`,
                  }}
                />
              </div>
            </section>
          ) : (
            <Card className="flex flex-col gap-4 border border-brand-primary/25 bg-white shadow-[0_1px_4px_rgba(47,36,17,0.07)]">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
                  <Flag aria-hidden="true" className="size-4" />
                </span>
                <div>
                  <h2 className="font-heading text-xl leading-tight text-text-primary">
                    Defina sua meta de leitura
                  </h2>
                  <p className="mt-1 font-interface text-sm leading-relaxed text-text-secondary">
                    Escolha quantos livros quer ler este ano e acompanhe seu
                    progresso por aqui.
                  </p>
                </div>
              </div>
              <ReadingGoalDialog
                trigger={
                  <Button
                    variant="tertiary"
                    className="w-full sm:w-auto sm:self-start"
                  >
                    Definir meta
                    <ArrowRight aria-hidden="true" className="size-4" />
                  </Button>
                }
              />
            </Card>
          )}

          <section className="rounded-card border border-brand-primary/25 bg-background-surface/35 p-5 shadow-[0_1px_4px_rgba(47,36,17,0.07)]">
            <h2 className="flex items-center gap-2 font-interface text-[0.65rem] font-bold tracking-[0.08em] text-brand-primary">
              <Lightbulb aria-hidden="true" className="size-4" />
              Inteligência Artificial
            </h2>
            <p className="mt-2 font-heading text-lg leading-tight text-text-primary">
              Descubra novos livros
            </p>
            <p className="mt-2 font-interface text-xs leading-relaxed text-text-secondary">
              Responda nosso quiz inteligente e receba recomendações
              personalizadas com base no seu perfil.
            </p>
            <p className="mt-4 font-interface text-xs font-semibold tracking-wide text-text-muted">
              Disponível em breve
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
