import { Link } from "react-router";
import { Button } from "../ui/Button";

export function NotFound() {
  return (
    <main className="h-screen flex items-center justify-center">
      <div className="w-4xl h-96 bg-background-surface flex flex-col gap-8 items-center justify-center rounded-2xl">
        <span
          aria-hidden="true"
          className="flex size-16 items-center justify-center rounded-full bg-background-subtle text-brand-primary"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-8"
          >
            <path d="M12 6.5c-2.2-1.5-5.1-1.7-8-.7v13.1c3-.9 5.8-.6 8 1.1 2.2-1.7 5-2 8-1.1V5.8c-2.9-1-5.8-.8-8 .7Z" />
            <path d="M12 6.5V20" />
            <path d="m15.5 10 3 3m0-3-3 3" />
          </svg>
        </span>
        <h1 className="text-heading-lg">Error 404 - Página não encontrada</h1>
        <p>Essa página não existe. Por favor volte ao menu.</p>
        <Link to={"/"}>
          <Button>
            <span aria-hidden="true">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4"
              >
                <path d="m3 10 9-7 9 7" />
                <path d="M5 9v11h14V9" />
                <path d="M9 20v-6h6v6" />
              </svg>
            </span>
            Voltar ao Menu
          </Button>
        </Link>
      </div>
    </main>
  );
}
