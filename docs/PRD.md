# PRD — Library

## 1. Metadados

| Campo | Definição |
|---|---|
| Produto | Library |
| Versão | MVP 1.0 |
| Status | Aprovado para implementação |
| Última atualização | 2026-08-25 |
| Responsável | Mantenedor do projeto |
| Stakeholders | Engenharia, QA, portfólio e avaliadores técnicos |
| Estágio | MVP |
| Risco | Médio |
| Criticidade de IA | Suporte |
| Audiência | Mista |

## 2. Resumo executivo

### Problema

Leitores mantêm lista de desejos, andamento, avaliações e reflexões em ferramentas desconectadas. Escolher uma próxima leitura exige repetir pesquisa sem considerar preferências atuais. Isso reduz valor do histórico pessoal e cria atrito entre descobrir, registrar e refletir.

### Solução proposta

Library é uma biblioteca pessoal web: usuário autentica, encontra livros no Google Books, salva-os em uma estante individual, muda o status de leitura, registra nota/resenha/anotações privadas, acompanha uma meta anual privada e recebe três recomendações explicadas por quiz guiado com IA.

### Resultados esperados

1. Uma demo pública permite concluir cadastro/login, salvar livro, registrá-lo como lido, avaliar/anotar e obter recomendação.
2. Dados de leitura e notas nunca ficam acessíveis por outro usuário.
3. Respostas inválidas ou indisponibilidade de Google Books/OpenAI não quebram a aplicação nem alteram dados locais.
4. Lint, typecheck, testes unitários, integração e E2E dos fluxos críticos passam no CI.

## 3. Contexto e alinhamento estratégico

Library é projeto de portfólio fullstack. O objetivo não é competir com Goodreads no MVP; é demonstrar produto completo, modelagem relacional, autorização, integrações externas, IA limitada por contrato e operação reproduzível. A experiência deve ser editorial, em light mode, responsiva e centrada em capas, sem sacrificar acessibilidade.

O MVP privilegia consistência, privacidade e clareza arquitetural. Crescimento social é possibilidade posterior: a separação entre `Book` compartilhado e `LibraryEntry` pessoal permite criar visibilidade, perfis e interações futuras sem alterar o catálogo ou migrar a relação usuário-livro.

## 4. Usuários, personas e Jobs To Be Done

### Persona primária — Leitor organizador

- **Quem é:** pessoa que lê regularmente, alterna entre obras e usa digital para pesquisar livros.
- **Objetivos:** não perder lista de leituras; lembrar o que achou de uma obra; decidir próxima leitura.
- **Dores:** listas dispersas, anotações em locais diferentes, recomendações genéricas sem justificativa.
- **Resultado desejado:** uma visão pessoal organizada, privada e útil antes/depois de ler.
- **Frequência:** consulta rápida semanal; uso intenso ao iniciar, finalizar ou procurar livro.

### JTBDs

- Quando descubro um livro interessante, quero salvá-lo em poucos passos, para não esquecê-lo.
- Quando concluo uma leitura, quero registrar avaliação e reflexão, para recuperar minha experiência depois.
- Quando não sei o que ler, quero responder preferências rápidas e entender o motivo das sugestões, para escolher com confiança.

## 5. Escopo funcional

### Fluxo A — Identidade e sessão

1. Visitante abre tela de acesso.
2. Escolhe e-mail/senha ou Google OAuth.
3. API valida credenciais ou callback, cria/vincula User e emite sessão.
4. Web redireciona para dashboard.
5. Logout revoga sessão e retorna à tela pública.

### Fluxo B — Descobrir e salvar livro

1. Usuário digita termo de busca.
2. Web consulta catálogo Google Books normalizado.
3. Usuário vê capa, título e autores e escolhe salvar.
4. API cria/recupera `Book` canônico e cria `LibraryEntry` pessoal em `WANT_TO_READ`.
5. Web atualiza biblioteca e dashboard; duplicata retorna feedback claro.

### Fluxo C — Acompanhar e refletir

1. Usuário abre item da biblioteca.
2. Troca status entre `WANT_TO_READ`, `READING` e `READ`.
3. Enquanto está em `READING`, pode registrar página atual quando o catálogo informar o total de páginas e criar anotações privadas.
4. Ao ficar `READ`, pode atribuir nota inteira 1–5 e resenha opcional; anotações privadas continuam disponíveis.
5. Dashboard reflete totais, média das avaliações, livros recentes e progresso da meta anual, quando configurada.

### Fluxo D — Definir meta anual

1. Usuário autenticado abre o dashboard.
2. Se não houver meta para o ano-calendário atual, vê um convite para defini-la.
3. Informa uma quantidade inteira entre 1 e 999; API cria ou atualiza sua única `ReadingGoal` anual.
4. API calcula `completedBooks` a partir das entradas do próprio usuário em `READ`.
5. Dashboard apresenta `completedBooks de targetBooks`, percentual e barra; usuário pode editar ou remover a meta.

### Fluxo E — Descoberta por IA

1. Usuário responde quiz de 5–7 preferências: gênero, objetivo, tamanho, ritmo, humor, temas e restrições.
2. API envia somente respostas do quiz ao OpenAI.
3. Provider retorna três itens estruturados: título, autor e justificativa.
4. API valida schema, remove duplicatas e enriquece itens no Google Books.
5. Web mostra as opções ou estado recuperável de indisponibilidade; usuário pode salvar uma sugestão.

### Histórias de usuário

- Como visitante, quero criar conta local para guardar uma biblioteca privada.
- Como visitante, quero usar Google para entrar com menos atrito.
- Como leitor, quero pesquisar catálogo confiável para registrar livros reais.
- Como leitor, quero controlar estado de leitura para entender minha fila e progresso.
- Como leitor, quero registrar anotações enquanto leio e após concluir, para preservar reflexões no momento em que surgem.
- Como leitor, quero acompanhar a página atual de um livro em leitura, para retomar meu progresso sem cálculo manual.
- Como leitor, quero avaliar e resenhar somente obras concluídas para vincular a avaliação à experiência completa.
- Como leitor, quero ver resumo de minha biblioteca para retomar contexto rapidamente.
- Como leitor, quero definir uma meta anual privada e acompanhar meu progresso automaticamente, para orientar meu ritmo de leitura sem controle manual.
- Como leitor, quero recomendações explicadas para avaliar se uma sugestão combina comigo.

### Fora de escopo do MVP

- Perfis públicos, seguir usuários, feed, comentários, reações e moderação.
- Visibilidade pública de resenha ou compartilhamento de notas.
- Desafios, notificações, gamificação e clubes de leitura.
- Importação de bibliotecas externas, compra, aluguel, e-book ou integração Kindle.
- Histórico persistido de sessões de recomendação e recomendador baseado em comportamento.
- Painel administrativo, cobrança, multi-idioma e requisitos regulatórios setoriais.

## 6. Requisitos funcionais

| ID | Requisito | Prioridade | Critérios de aceite |
|---|---|---|---|
| RF-001 | Cadastro local | Must | E-mail válido e único; senha atende política; hash Argon2 nunca retorna; sessão é emitida. |
| RF-002 | Login local/logout/sessão | Must | Credencial válida cria sessão; sessão expirada/revogada falha; logout invalida acesso posterior. |
| RF-003 | Login Google | Must | OAuth usa state/PKCE; e-mail verificado cria/vincula conta; callback inválido não cria sessão. |
| RF-004 | Busca de catálogo | Must | Termo válido retorna itens normalizados, paginados; erro externo retorna código recuperável. |
| RF-005 | Adicionar livro | Must | Mesmo livro pode existir para usuários distintos; mesma dupla user/book não duplica LibraryEntry. |
| RF-006 | Gerir biblioteca | Must | Usuário lista, filtra, atualiza status, página atual quando estiver `READING` e remove apenas suas entradas. |
| RF-007 | Avaliar e resenhar | Must | Rating inteiro entre 1–5 e review só são aceitos se estado resultante for `READ`. |
| RF-008 | Gerir anotações | Must | Criar/editar/excluir Note só é permitido ao owner de LibraryEntry em `READING` ou `READ`; `WANT_TO_READ` bloqueia mutação. |
| RF-009 | Dashboard | Should | Exibe contagem por status, média de ratings de `READ` e itens recentes do usuário. |
| RF-010 | Quiz | Must | Formulário exige respostas válidas antes de chamar API; usuário pode voltar sem perder respostas. |
| RF-011 | Recomendação IA | Must | Retorna exatamente três sugestões únicas, estruturadas e explicadas, ou fallback de indisponibilidade. |
| RF-012 | Salvar recomendação | Must | Cada recomendação pode usar mesmo fluxo de inclusão e comunica conflito/sucesso. |
| RF-013 | Estados de UX | Must | Cada consulta/mutação tem loading, empty quando aplicável, erro legível e retry quando seguro. |
| RF-014 | Meta anual de leitura | Must | Usuário autenticado cria, atualiza ou remove somente sua meta do ano atual; alvo inteiro 1–999; progresso conta apenas suas `LibraryEntry` em `READ`. |
| RF-015 | Página atual e progresso individual | Should | Em `READING`, usuário atualiza página atual inteira entre 0 e `Book.pageCount`; sem `pageCount`, controle não aparece; `READ` é apresentado como concluído. |

## 7. Regras de negócio e permissões

### Estados de leitura

| Estado | Significado | Ações permitidas |
|---|---|---|
| `WANT_TO_READ` | obra salva para futuro | mover para READING/READ, remover |
| `READING` | leitura em curso | mover para WANT_TO_READ/READ, remover, atualizar página atual e gerir notas |
| `READ` | leitura concluída | mudar estado, remover, rating, review e notas |

- A transição é livre entre os três estados no MVP; o estado atual é fonte de verdade.
- Se usuário alterar `READ` para outro estado, API rejeita atualização que tente manter/enviar rating ou review naquele mesmo comando. A interface não oferece esses campos fora de `READ`.
- `rating` é inteiro de 1 a 5; `review` é opcional.
- Note pertence a uma única LibraryEntry e não tem visibilidade pública. Sua criação, edição e exclusão exigem estado `READING` ou `READ`.

### Página atual e progresso individual

- `LibraryEntry.currentPage` é opcional, inteiro e inicia em `0`. A API aceita atualização somente se o estado resultante for `READING`.
- Quando `Book.pageCount` existir, `currentPage` deve estar entre `0` e esse total. Sem `pageCount`, a interface não oferece controle nem percentual de páginas.
- O progresso individual é calculado como `floor(currentPage / pageCount * 100)` e exibido apenas em `READING`. Em `READ`, a interface informa leitura concluída sem exigir que `currentPage` seja igual ao total.
- Mudanças de status não apagam `currentPage` nem Notes. Ao retornar a `READING`, a última página registrada pode ser atualizada novamente; em `WANT_TO_READ`, a interface não permite editar página ou notas.

### Meta anual de leitura

- `ReadingGoal` é privada, opcional e tem unicidade em `(userId, year)`; no MVP, a UI administra apenas a meta do ano-calendário atual.
- `targetBooks` é inteiro entre 1 e 999. A criação e atualização usam upsert; remoção exclui apenas a meta, nunca registros de leitura.
- `completedBooks` não é persistido: é calculado a partir do status atual `READ` das `LibraryEntry` do owner. Assim, uma transição de/para `READ` e uma exclusão são refletidas no próximo carregamento.
- `progressPercent = min(100, floor(completedBooks / targetBooks * 100))`; a contagem não é limitada, portanto 15 leituras em meta 12 continua exibindo `15 de 12`.

### Autorização

- Rotas privadas exigem sessão válida.
- Toda leitura/mutação de LibraryEntry filtra `id` e `userId` da sessão.
- Toda Note valida ownership através de sua LibraryEntry; nunca apenas pelo `noteId`.
- Book é dado compartilhado/canônico; não contém dado pessoal.

## 8. Requisitos técnicos e arquitetura

### Arquitetura de alto nível

Monorepo `pnpm` com três unidades: `apps/web` (React/Vite), `apps/api` (Fastify) e `packages/contracts` (Zod/tipos). API REST é fonte de verdade. PostgreSQL guarda dados relacionais. Adaptadores isolam Google Books e OpenAI; domínio não depende dos SDKs externos.

### Módulos da API

| Módulo | Responsabilidade | Entrada/Saída | Dependências |
|---|---|---|---|
| Auth | cadastro, login, OAuth, sessão | credenciais/callback → User público + cookie | Prisma, Google OAuth |
| Catalog | busca e normalização | termo/página → Book externo | Google Books adapter |
| Library | Book salvo, estado, página atual, rating, review | comandos → LibraryEntry | Prisma, contracts |
| Notes | conteúdo privado | comandos → Note | Library, Prisma |
| Dashboard | agregações pessoais | sessão → métricas | Prisma |
| Reading Goals | meta anual e progresso calculado | comando/sessão → ReadingGoal e resumo | Prisma, Library |
| Recommendations | quiz e enriquecimento | QuizRequest → 3 recomendações | OpenAI, Catalog |

### Entidades e ownership

```text
User 1──N Session
User 1──N OAuthAccount
User 1──N LibraryEntry N──1 Book
LibraryEntry 1──N Note
User 1──N ReadingGoal
```

| Entidade | Dados essenciais | Constraints |
|---|---|---|
| User | id, email, passwordHash?, name?, avatarUrl?, timestamps | email único |
| OAuthAccount | userId, provider, providerAccountId | provider + providerAccountId único |
| Session | userId, tokenHash, expiresAt, revokedAt? | tokenHash único; sessão expira |
| Book | googleBooksId, title, authors, description?, coverUrl?, language?, pageCount? | googleBooksId único |
| LibraryEntry | userId, bookId, status, currentPage?, rating?, review?, timestamps | userId + bookId único; currentPage entre 0 e Book.pageCount quando conhecido |
| Note | libraryEntryId, content, timestamps | herda owner pela entrada |
| ReadingGoal | userId, year, targetBooks, timestamps | userId + year único; targetBooks 1–999 |

### Contratos HTTP de alto nível

| Rota | Uso | Auth |
|---|---|---|
| `POST /auth/register` | cadastro local | não |
| `POST /auth/login` | login local | não |
| `POST /auth/logout` / `GET /auth/me` | sessão | sim |
| `GET /auth/google` e callback | início/retorno OAuth | não |
| `GET /books/search` | catálogo paginado | não |
| `GET/POST /library` | listar/adicionar biblioteca | sim |
| `GET/PATCH/DELETE /library/:id` | detalhe/gestão | sim |
| `POST /library/:id/notes` | criar anotação | sim |
| `PATCH/DELETE /notes/:id` | gerir anotação | sim |
| `GET /dashboard` | resumo pessoal | sim |
| `GET`/`PUT`/`DELETE /reading-goal` | consultar, definir ou remover meta anual atual | sim |
| `POST /recommendations` | quiz e sugestões | sim |

Erros conhecidos seguem `{ code, message, fieldErrors? }`. Payloads de escrita são validados por Zod no servidor, mesmo quando frontend também os valida.

## 9. Requisitos não funcionais

### Segurança e privacidade

- Senha usa Argon2; token de sessão é opaco, aleatório e só seu hash é persistido.
- Cookie usa `HttpOnly`, `SameSite=Lax` e `Secure` em produção.
- OAuth usa Authorization Code, PKCE e state; redirect URIs são allowlisted no provedor.
- Rate limit protege cadastro, login e recomendações.
- Logs não contêm senha, token, cookie, review ou texto de Note.
- OpenAI recebe apenas respostas do quiz, nunca biblioteca, ratings, resenhas ou anotações.

### Desempenho e escala

- Listas e busca usam paginação; queries pessoais usam índice compatível com `userId`, status e atualização.
- Integrações externas possuem timeout; a UI não bloqueia indefinidamente.
- Volume inicial é baixo; escala vertical de API/DB é suficiente. Cache, fila e microsserviços são adiados até evidência de necessidade.

### Confiabilidade e observabilidade

- Falha externa não cria LibraryEntry/Note parcial e produz estado retryável.
- API usa logs estruturados com request ID, rota, status, duração e categoria de erro.
- Medir latência/taxa de erro de API, Google Books, OpenAI, auth e recomendações estruturadas.
- Alertar aumento sustentado de 5xx interno ou falhas dos provedores.

### Acessibilidade e UX

- Navegação completa por teclado; foco visível após dialogs e mutations.
- Inputs têm label, erros associados e validação compreensível.
- Capas têm texto alternativo; contraste atende controles e texto críticos.
- Layout suporta viewport mobile e desktop; estados loading/empty/error são parte de cada fluxo.

## 10. Requisitos de IA

### Papel e limites

IA sugere leitura; não aprova conteúdo, não toma decisão irreversível, não altera biblioteca e não substitui escolha humana. Usuário vê justificativa e explicitamente escolhe salvar item.

### Entrada e saída

- **Entrada:** gênero, objetivo, tamanho desejado, ritmo, humor, temas e restrições do quiz.
- **Saída:** array de exatamente três objetos únicos com `title`, `author` e `reason`.
- **Validação:** Zod rejeita quantidade diferente de três, campos vazios, duplicatas e texto fora do contrato.
- **Enriquecimento:** Catalog busca título/autor no Google Books para capa/metadados antes da resposta final.

### Qualidade, monitoramento e fallback

- Avaliar offline perfis curados para validar schema, ausência de duplicata e justificativa relacionada às respostas.
- Medir taxa de saída estruturada válida, falha/timeout, latência e conversão em salvar livro.
- Fallback: erro categorizado e mensagem para tentar novamente; nenhuma recomendação parcial é persistida.
- Revisão humana não é necessária para recomendação pessoal, mas usuário mantém controle total da decisão.

## 11. Métricas de sucesso e critérios de release

### Produto

- Roteiro de demo completa todos quatro fluxos principais em ambiente público.
- Usuário consegue salvar ao menos uma recomendação no roteiro de demo.
- Nenhum fluxo crítico depende de edição direta do banco ou chamada manual de API.

### Técnicas

- CI passa lint, format-check, typecheck, unitários, integração e E2E críticos.
- Durante smoke test, zero respostas 5xx internas nos fluxos críticos.
- Falha simulada de Google Books/OpenAI é exibida como erro recuperável.
- Todas rotas privadas rejeitam usuário não autenticado e acesso cruzado.

### Release

- Segredos configurados somente no ambiente de deploy.
- Migrations aplicadas uma vez antes da versão da API.
- HTTPS, CORS, cookie e redirect URIs foram validados em staging.
- README descreve setup, env, scripts, endpoints, arquitetura e falhas de provedores.
- Smoke test público aprovado para auth, biblioteca, notes e recomendação.

## 12. Estratégia de testes

| Camada | Escopo | Exemplos |
|---|---|---|
| Unitário | regras puras e adapters | status/rating, página atual, cálculo de meta, schemas, normalização Book, validação de IA |
| Integração | HTTP + Fastify + PostgreSQL isolado | auth, ownership, CRUD, página atual, notes em READING/READ, dashboard, meta anual, conflitos |
| Contrato | fronteiras JSON/Zod | payloads inválidos, error envelope, providers mockados |
| E2E | web e fluxos críticos | cadastro, busca/salvar, READING/página/note, READ/rating, meta anual, quiz/salvar |
| Segurança | comportamento externo | 401, 403/404 de item alheio, sessão expirada, rate limit |
| Acessibilidade | UI crítica | teclado, focus, labels, erros, mobile |
| IA offline | output de provider mockado/real controlado | 3 itens, schema, duplicata, privacidade, fallback |

## 13. Riscos, premissas e dependências

| Risco | Impacto | Probabilidade | Mitigação | Dono |
|---|---|---|---|---|
| Quota/indisponibilidade Google Books | Médio | Média | timeout, adapter, erro/retry | API |
| Custo/limite OpenAI | Médio | Média | payload curto, rate limit, métricas e orçamento | API |
| OAuth configurado errado | Alto | Baixa | checklist redirect URI e staging smoke | DevOps |
| saída IA inválida | Médio | Média | schema, testes offline e fallback | API/QA |
| acesso cruzado de dados | Alto | Baixa | filtro por owner e integração de segurança | API/QA |
| regressão em produção | Médio | Média | CI, staging, migration controlada e smoke | DevOps |

**Premissas:** uso individual; baixo volume inicial; PostgreSQL/hosting gerenciados; provedores possuem credenciais válidas; sem obrigação de compliance setorial; usuário aceita catálogo externo.

**Dependências:** Google OAuth client, Google Books, OpenAI, PostgreSQL, hosting web/API e configuração de domínio/HTTPS.

## 14. Roadmap de produto

| Fase | Objetivo | Escopo | Critério de saída |
|---|---|---|---|
| Fundação | executar com segurança | workspace, CI, DB, contracts | clone limpo passa pipeline |
| Núcleo privado | registrar leitura | auth, catálogo, biblioteca, página atual, notes, dashboard e meta anual | CRUD isolado por owner e meta calculada corretamente |
| Descoberta | recomendar | quiz, OpenAI, enriquecimento | 3 sugestões/fallback testado |
| Release | publicar demo | hardening, docs, deploy | smoke público aprovado |
| Futuro social | interação opcional | profile, visibility, follow, activity | novo PRD e ADR aprovados |

## 15. Perguntas em aberto

Nenhuma decisão em aberto bloqueia desenvolvimento local. Antes do deploy, mantenedor define provedor, domínio, limites mensais de custo e valores de produção para Google/OpenAI.

## 16. Checklist de qualidade

- [x] Problema, persona, escopo e não objetivos estão explícitos.
- [x] Fluxos, regras, requisitos e critérios de aceite são verificáveis.
- [x] Entidades, ownership, integrações e contratos de alto nível estão definidos.
- [x] Segurança, privacidade, acessibilidade, observabilidade e resiliência foram cobertas.
- [x] Papel da IA, validação, avaliação, fallback e dados proibidos estão definidos.
- [x] Métricas, release, testes, riscos, premissas e dependências estão mapeados.
