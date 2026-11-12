# Arquitetura e integrações externas

Este documento descreve o comportamento confirmado na implementação atual. Não cria nem altera decisões arquiteturais; decisões registradas continuam nos ADRs existentes.

## Aplicação

O repositório é um workspace pnpm com três partes principais:

- `apps/web`: interface React/Vite. O cliente Axios lê `VITE_API_URL`, envia cookies com `withCredentials` e converte falhas HTTP pelo parser compartilhado da aplicação.
- `apps/api`: API REST Fastify. `app.ts` registra plugins e módulos de autenticação, livros, biblioteca, notas, dashboard, metas e recomendações.
- `packages/contracts`: schemas Zod e tipos públicos usados pela web e pela API. A API valida requests e responses nas rotas.

A API usa PostgreSQL como persistência transacional. Prisma define o schema e as migrations; o cliente conecta ao PostgreSQL pelo adaptador `@prisma/adapter-pg`. A configuração está em [`schema.prisma`](../apps/api/prisma/schema.prisma), [`prisma.ts`](../apps/api/src/lib/prisma.ts) e [`prisma.config.ts`](../apps/api/prisma.config.ts).

Os módulos da API mantêm rotas, serviços e repositórios por área funcional. As integrações externas ficam em adapters próprios. `app.ts` monta a configuração de produção; testes podem substituir os adapters ou suas dependências.

## Google OAuth

O adapter [`googleOAuthAdapter.ts`](../apps/api/src/modules/auth/google/googleOAuthAdapter.ts) monta a URL de autorização com `state` e PKCE, troca o código por token e consulta o endpoint OpenID Connect para obter o perfil. Cada chamada usa timeout de cinco segundos. O serviço consome o state armazenado antes de concluir o login e persiste usuário, vínculo OAuth e sessão em transação.

Falha HTTP, rede, timeout ou resposta incompatível do Google vira erro genérico `502 INTEGRATION_ERROR`. State não reconhecido, expirado ou já consumido e e-mail não verificado resultam em `401 UNAUTHENTICATED`; parâmetros obrigatórios ausentes são rejeitados pela validação da rota. A API não devolve os tokens do Google ao cliente; a sessão da aplicação é enviada em cookie.

Os testes unitários simulam `fetch`. Os testes HTTP de OAuth substituem o adapter com mocks e usam o banco de integração para verificar persistência e sessão, sem chamar o Google: [`googleOAuthAdapter.unit.test.ts`](../apps/api/src/modules/auth/google/googleOAuthAdapter.unit.test.ts) e [`googleOAuthRoutes.integration.test.ts`](../apps/api/src/modules/auth/tests/googleOAuthRoutes.integration.test.ts).

## Google Books

[`googleBooksCatalogAdapter.ts`](../apps/api/src/modules/books/googleBooksCatalogAdapter.ts) implementa busca por ID e busca paginada. Envia a chave no header `X-Goog-Api-Key`, aplica timeout de cinco segundos, valida o payload externo com Zod e transforma os campos disponíveis para os DTOs internos. Metadados opcionais ausentes viram `null`; autores ausentes viram lista vazia.

Status HTTP de erro (inclusive volume não encontrado), falha de rede, timeout, JSON inválido ou formato incompatível viram `502 INTEGRATION_ERROR` com mensagem genérica. A causa e o corpo do provedor não são retornados ao cliente.

Os testes unitários injetam um `fetchImpl` falso. Os testes HTTP da busca substituem o adapter; não fazem chamadas reais ao catálogo: [`googleBooksCatalogAdapter.unit.test.ts`](../apps/api/src/modules/books/tests/googleBooksCatalogAdapter.unit.test.ts) e [`bookSearchRoutes.integration.test.ts`](../apps/api/src/modules/books/tests/bookSearchRoutes.integration.test.ts).

## Gemini

O adapter [`geminiRecommendationAdapter.ts`](../apps/api/src/modules/recommendations/geminiRecommendationAdapter.ts) recebe o cliente `@google/genai` e o modelo pela composição da API. Envia as respostas validadas do quiz, pede JSON estruturado e aplica timeout de 60 segundos. A saída é validada por `recommendationQuizResponseSchema`, que exige três recomendações distintas com título, autor e justificativa. O serviço valida a resposta novamente antes de devolvê-la.

Falha do provedor ou saída ausente, malformada ou incompatível vira `502 INTEGRATION_ERROR`, sem detalhes internos do Gemini no corpo HTTP. A rota permanece autenticada e tem rate limit. O payload enviado contém as respostas do quiz; notas, resenhas e registros privados da biblioteca não são usados como contexto.

Os testes unitários usam um cliente Gemini falso. Os testes HTTP substituem o provider e simulam a sessão; não dependem da API Gemini: [`geminiRecommendationAdapter.unit.test.ts`](../apps/api/src/modules/recommendations/tests/geminiRecommendationAdapter.unit.test.ts) e [`recommendationsRoutes.integration.test.ts`](../apps/api/src/modules/recommendations/tests/recommendationsRoutes.integration.test.ts).

## Logs de chamadas a provedores

As rotas que usam Google Books ou Gemini passam o ID da requisição ao helper de telemetria. Ele registra somente provedor, operação, duração, resultado e `requestId`; não recebe nem registra payload ou resposta do provedor. A configuração do logger também remove corpos de request/response, cookies, tokens, chaves e campos de notas e resenhas. Veja [`providerTelemetry.ts`](../apps/api/src/observability/providerTelemetry.ts) e [`fastifyLoggerConfig.ts`](../apps/api/src/config/fastify/fastifyLoggerConfig.ts).

## Fronteiras dos testes

| Tipo | O que usa | Dependência externa real |
| --- | --- | --- |
| Unitário do adapter | `fetchImpl`, cliente Gemini ou `fetch` substituídos | Nenhuma |
| Integração da API | Fastify via `app.inject`; adapters externos mockados; PostgreSQL de `library_test` quando há persistência | PostgreSQL de teste |
| E2E web | Vite local e respostas HTTP simuladas nos testes Playwright | Não inicia API, PostgreSQL ou provedores |
| CI de qualidade | PostgreSQL de serviço, migrations, unitários e integração | Nenhuma credencial de provedor |
| CI E2E | Chromium e servidor Vite local | Nenhum serviço de API ou provedor |

A configuração de integração carrega `apps/api/.env` e `apps/api/.env.test`, depois direciona `DATABASE_URL` para `TEST_DATABASE_NAME` (padrão `library_test`). Os testes E2E interceptam endpoints da API com `page.route`; portanto, validam a interface e seus fluxos HTTP simulados, não o backend real. A pipeline e a configuração do Playwright estão em [`ci.yml`](../.github/workflows/ci.yml) e [`playwright.config.ts`](../apps/web/playwright.config.ts).
