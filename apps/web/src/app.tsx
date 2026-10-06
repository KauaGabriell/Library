import { useState } from "react";
import { AppShell } from "./components/layout/AppShell";
import { Button } from "./components/ui/Button";
import { Card } from "./components/ui/Card";
import { Dialog } from "./components/ui/Dialog";
import { EmptyState } from "./components/ui/EmptyState";
import { ErrorState } from "./components/ui/ErrorState";
import { Input } from "./components/ui/Input";
import { LoadingState } from "./components/ui/LoadingState";
import { Select } from "./components/ui/Select";

export function App() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  return (
    <AppShell activeHref={window.location.pathname}>
      <div className="flex flex-col gap-10">
        <section aria-labelledby="welcome-title" className="max-w-3xl">
          <p className="mb-3 text-label-sm uppercase tracking-[0.16em] text-brand-primary">
            Sua leitura, no seu ritmo
          </p>
          <h1
            id="welcome-title"
            className="font-heading text-heading-lg font-semibold leading-tight md:text-display"
          >
            Uma biblioteca feita para acompanhar suas histórias.
          </h1>
          <p className="mt-4 max-w-prose text-body-lg text-text-secondary">
            Organize o que quer ler, acompanhe suas leituras e guarde suas
            impressões em um só lugar.
          </p>
        </section>

        <Card>
          <EmptyState
            title="Sua biblioteca começa com um livro"
            description="Busque o próximo título que quer ler e adicione-o à sua biblioteca pessoal."
            action={
              <a
                href="/search"
                className="inline-flex min-h-11 items-center justify-center rounded-field bg-brand-primary px-4 py-2 text-label-md text-background-canvas transition-colors hover:bg-brand-primary-hover motion-reduce:transition-none"
              >
                Buscar livros
              </a>
            }
          />
        </Card>

        <details className="group">
          <summary className="min-h-11 w-fit cursor-pointer py-2 text-label-md text-brand-primary underline decoration-border-default underline-offset-4">
            Prévia dos componentes base
          </summary>
          <Card className="mt-4">
            <div className="flex flex-col gap-8">
              <section
                aria-labelledby="buttons-title"
                className="flex flex-col gap-3"
              >
                <h2 id="buttons-title" className="font-heading text-heading-md">
                  Botões
                </h2>
                <div className="flex flex-wrap items-center gap-3">
                  <Button>Primário</Button>
                  <Button variant="secondary">Secundário</Button>
                  <Button variant="ghost">Terciário</Button>
                  <Button variant="destructive">Destrutivo</Button>
                  <Button loading>Salvando</Button>
                  <Button disabled>Desabilitado</Button>
                  <Button onClick={() => setDialogOpen(true)}>
                    Abrir diálogo
                  </Button>
                </div>
              </section>

              <section
                aria-labelledby="fields-title"
                className="grid gap-6 md:grid-cols-2"
              >
                <h2 id="fields-title" className="sr-only">
                  Campos de formulário
                </h2>
                <Input
                  label="E-mail"
                  type="email"
                  placeholder="voce@exemplo.com"
                />
                <Input
                  label="Campo com erro"
                  placeholder="Revise este campo"
                  error="Informe um valor válido."
                />
                <Select label="Status de leitura" defaultValue="reading">
                  <option value="want-to-read">Quero ler</option>
                  <option value="reading">Lendo</option>
                  <option value="read">Lido</option>
                </Select>
                <Select label="Campo com erro" error="Escolha uma opção.">
                  <option value="">Selecione</option>
                  <option value="one">Opção um</option>
                </Select>
              </section>

              <section
                aria-labelledby="states-title"
                className="flex flex-col gap-4"
              >
                <h2 id="states-title" className="font-heading text-heading-md">
                  Estados
                </h2>
                <LoadingState label="Carregando sua biblioteca" />
                <ErrorState
                  message={
                    retryCount > 0
                      ? `Falha simulada. Tentativa ${retryCount}.`
                      : "Não foi possível carregar os dados."
                  }
                  onRetry={() => setRetryCount((count) => count + 1)}
                />
                <ErrorState message="Esta falha não pode ser repetida agora." />
              </section>
            </div>
          </Card>
        </details>
      </div>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Diálogo acessível"
      >
        <div className="flex flex-col gap-5">
          <p className="text-body-md text-text-secondary">
            O elemento nativo mantém o foco dentro do diálogo e permite fechar
            com Escape.
          </p>
          <Button variant="secondary" onClick={() => setDialogOpen(false)}>
            Concluir
          </Button>
        </div>
      </Dialog>
    </AppShell>
  );
}
