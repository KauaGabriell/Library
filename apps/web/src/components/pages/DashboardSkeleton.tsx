import { BookSkeleton } from "../ui/BookSkeleton";
import { Card } from "../ui/Card";
import { Skeleton } from "../ui/Skeleton";

const metricSkeletons = ["want-to-read", "reading", "read", "rating"];
const recentBookSkeletons = ["recent-book-1", "recent-book-2", "recent-book-3"];

export function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-272 lg:pt-4">
      <p role="status" className="sr-only">
        Carregando painel...
      </p>

      <div aria-busy="true">
        <header className="mb-8">
          <Skeleton className="h-10 w-64 rounded-sm sm:w-88" />
          <Skeleton className="mt-2 h-4 w-72 rounded-sm" />
        </header>

        <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {metricSkeletons.map((metric) => (
            <Card
              key={metric}
              padding="compact"
              className="relative flex min-h-22 flex-col justify-end gap-2 border-border-default/55 bg-white"
            >
              <Skeleton className="absolute top-3.5 right-4 size-4 rounded-full" />
              <Skeleton className="h-8 w-14 rounded-sm" />
              <Skeleton className="h-3 w-20 rounded-sm" />
            </Card>
          ))}
        </section>

        <div className="mt-10 grid gap-8 xl:grid-cols-[minmax(0,1.65fr)_minmax(17rem,1fr)] xl:gap-6">
          <section className="flex min-h-72 flex-col">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="font-heading text-2xl text-text-primary">
                Atividade recente
              </h2>
              <Skeleton className="h-3 w-14 rounded-sm" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {recentBookSkeletons.map((book) => (
                <BookSkeleton key={book} />
              ))}
            </div>
          </section>

          <aside className="flex flex-col gap-4">
            <section className="min-h-28 border border-border-default/40 bg-white p-5">
              <Skeleton className="h-3 w-24 rounded-sm" />
              <div className="mt-3 flex items-center gap-4">
                <Skeleton className="aspect-2/3 w-12 shrink-0 rounded-xs" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-4 w-28 rounded-sm" />
                  <Skeleton className="h-3 w-20 rounded-sm" />
                  <Skeleton className="h-3 w-16 rounded-sm" />
                </div>
              </div>
            </section>

            <section className="min-h-32 border border-border-default/40 bg-background-surface/50 p-5">
              <Skeleton className="h-3 w-24 rounded-sm" />
              <Skeleton className="mt-3 h-8 w-24 rounded-sm" />
              <Skeleton className="mt-2 h-3 w-28 rounded-sm" />
              <Skeleton className="mt-4 h-1.5 w-full rounded-full" />
            </section>

            <section className="min-h-44 border border-brand-primary/25 bg-background-surface/35 p-5">
              <Skeleton className="h-4 w-36 rounded-sm" />
              <Skeleton className="mt-3 h-5 w-40 rounded-sm" />
              <Skeleton className="mt-2 h-3 w-full rounded-sm" />
              <Skeleton className="mt-2 h-3 w-4/5 rounded-sm" />
              <Skeleton className="mt-4 h-10 w-28 rounded-sm" />
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
