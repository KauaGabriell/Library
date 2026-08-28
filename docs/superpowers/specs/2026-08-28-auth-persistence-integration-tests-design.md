# Testes de Integração — Persistência de Autenticação

## Objetivo

Validar constraints reais do PostgreSQL para modelos `User`, `OAuthAccount` e `Session`, sem usar banco de desenvolvimento.

## Ambiente

- Banco exclusivo: `library_test`.
- Variável: `DATABASE_URL` carregada de `apps/api/.env.test` antes dos imports da aplicação.
- `apps/api/.env.test` fica fora do Git.
- `apps/api/.env.test.example` documenta valores locais sem segredos.

## Execução

- Novo script `test:integration` em `apps/api/package.json` executa somente testes de integração.
- O script usa configuração Vitest que carrega `.env.test` antes de cada arquivo de teste.

## Casos de teste

1. Criar dois usuários com mesmo `email`; segundo insert falha por constraint única.
2. Criar dois vínculos OAuth com mesmo `[provider, providerAccountId]`; segundo insert falha por constraint única.
3. Criar sessão com `userId` inexistente; insert falha por foreign key.

## Isolamento

Cada teste remove seus dados após execução, nesta ordem: `Session`, `OAuthAccount`, `User`. A limpeza evita dependência entre casos e mantém `library_test` descartável.

## Fora de escopo

- Fluxo HTTP de cadastro/login.
- Hash de senha e emissão de token.
- Testes contra banco de desenvolvimento ou produção.
