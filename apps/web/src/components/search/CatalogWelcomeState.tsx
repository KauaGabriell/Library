import { ArrowRight, BookOpen, ChevronDown } from "lucide-react";
import { Link } from "react-router";

export function CatalogWelcomeState() {
  return (
    <section
      aria-labelledby="catalog-welcome-title"
      className="flex min-h-[22rem] flex-col items-center justify-center rounded-card border border-border-default/55 bg-background-canvas px-6 py-12 text-center sm:min-h-96 sm:px-10"
    >
      <div className="mb-6 grid size-16 place-items-center rounded-full border border-brand-primary/20 bg-brand-primary/5 text-brand-primary">
        <BookOpen aria-hidden="true" className="size-8" strokeWidth={1.5} />
      </div>

      <h2
        id="catalog-welcome-title"
        className="font-heading text-heading-lg font-medium text-text-primary"
      >
        Seu próximo livro está por aí
      </h2>
      <p className="mt-3 max-w-prose font-interface text-sm leading-relaxed text-text-secondary sm:text-base">
        Digite pelo menos 2 caracteres para pesquisar no catálogo.
      </p>

      <details className="group mt-6 max-w-prose">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center gap-2 rounded-field px-3 py-2 font-interface text-sm font-semibold text-brand-primary underline underline-offset-4 transition-colors hover:text-brand-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary motion-reduce:transition-none [&::-webkit-details-marker]:hidden">
          Não encontrou seu livro?
          <ChevronDown
            aria-hidden="true"
            className="size-4 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none"
          />
        </summary>
        <p className="mt-3 font-interface text-sm leading-relaxed text-text-secondary">
          A busca depende dos livros disponíveis no catálogo online do Google
          Livros. Se o título não estiver lá, ele não aparecerá nos resultados.
        </p>
        <Link
          to="/library"
          className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-field bg-brand-primary px-4 py-2 font-interface text-sm font-semibold text-background-canvas transition-colors hover:bg-brand-primary-hover motion-reduce:transition-none"
        >
          Ir para minha biblioteca
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </details>
    </section>
  );
}
