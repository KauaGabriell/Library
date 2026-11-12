# Library

Aplicação web para organizar leituras, acompanhar o progresso e receber recomendações de livros.

## Requisitos

- Node.js 24 ou superior
- pnpm 11.21.0
- Docker Compose para iniciar o PostgreSQL local

## Instalação

Na raiz do repositório:

```sh
pnpm install --frozen-lockfile
```

Crie os arquivos locais de ambiente a partir dos exemplos:

```powershell
Copy-Item .env.example .env
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/api/.env.test.example apps/api/.env.test
Copy-Item apps/web/.env.example apps/web/.env
```

Os valores marcados como `placeholder` são exemplos e não funcionam como credenciais. Preencha os valores locais em `apps/api/.env` com as credenciais necessárias para Google OAuth, Google Books e Gemini. O `GOOGLE_REDIRECT_URI` precisa apontar para o callback da API e ser igual ao URI autorizado no Google Cloud; em desenvolvimento, confirme que a porta corresponde ao `PORT` da API. Nunca versione arquivos `.env` nem use credenciais reais nos exemplos.

O usuário, a senha e o banco de `.env` devem corresponder aos valores usados em `POSTGRES_USER`, `POSTGRES_PASSWORD` e `POSTGRES_DB` no arquivo raiz `.env`.

## Banco de dados

Inicie o PostgreSQL e gere o Prisma Client:

```sh
docker compose up -d
pnpm --filter @library/api prisma:generate
```

Aplique as migrations no banco local:

```sh
pnpm --filter @library/api prisma:migrate
```

Os testes de integração usam um banco separado chamado `library_test`. Crie-o uma vez:

```sh
docker compose exec postgres psql -U library -d postgres -c "CREATE DATABASE library_test;"
```

Aplique as migrations nesse banco. No PowerShell:

```powershell
$env:DATABASE_URL = "postgresql://library:SUA_SENHA@localhost:5432/library_test"
pnpm --filter @library/api exec prisma migrate deploy
Remove-Item Env:DATABASE_URL
```

Substitua `SUA_SENHA` pela mesma senha configurada no `.env`. O arquivo `apps/api/.env.test` define o nome do banco usado pela configuração de integração; ela deriva a URL a partir de `DATABASE_URL` e direciona as consultas para `library_test`.

## Executar localmente

Com os arquivos de ambiente e o banco configurados:

```sh
pnpm dev
```

O comando inicia a API e a aplicação web. Por padrão, a API usa `http://localhost:3000` e o Vite usa `http://localhost:5173`.

## Verificações e testes

Execute a partir da raiz:

```sh
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm test:e2e
pnpm --filter @library/web build
```

Os testes de integração precisam do PostgreSQL e das migrations em `library_test`. Antes da primeira execução E2E, instale o Chromium do Playwright:

```sh
pnpm --filter @library/web exec playwright install chromium
```

Os testes E2E iniciam um servidor web local; consulte `apps/web/playwright.config.ts` para a porta e configuração usadas. `pnpm test:all` executa os testes unitários e de integração, sem incluir E2E.

## Estrutura do workspace

- `apps/api`: API Fastify, persistência PostgreSQL e Prisma.
- `apps/web`: aplicação React/Vite.
- `packages/contracts`: schemas Zod e tipos compartilhados entre API e web.
- `docs`: PRD, guia visual, decisões e documentação do projeto.

Veja [arquitetura e integrações externas](docs/architecture-and-providers.md) para detalhes sobre persistência, provedores e fronteiras dos testes.
