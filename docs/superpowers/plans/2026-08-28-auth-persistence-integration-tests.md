# Auth Persistence Integration Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove PostgreSQL constraints for authentication persistence against isolated `library_test` database.

**Architecture:** Vitest integration config loads `apps/api/.env.test` before test modules import Prisma. Tests call generated Prisma client directly and clean test rows after each case, so assertions exercise PostgreSQL unique and foreign-key constraints rather than mocks.

**Tech Stack:** TypeScript, Vitest, Prisma 7, PostgreSQL, dotenv.

**Spec:** `docs/superpowers/specs/2026-08-28-auth-persistence-integration-tests-design.md`

## Global Constraints

- Run integration tests only against database `library_test`.
- Never store `.env.test` in Git; version only `.env.test.example`.
- Test real PostgreSQL constraints; do not mock Prisma.
- Cleanup order: `Session`, `OAuthAccount`, `User`.
- No production auth route, token generation, password hashing, or schema changes.

---

### Task 1: Isolated Vitest environment

**Files:**
- Create: `apps/api/.env.test.example`
- Create: `apps/api/vitest.integration.config.ts`
- Modify: `apps/api/.gitignore`
- Modify: `apps/api/package.json`

**Interfaces:**
- Consumes: `DATABASE_URL`, `NODE_ENV`, `PORT`, `FRONTEND_URL` expected by `src/config/env.ts`.
- Produces: `pnpm --filter @library/api test:integration`, which loads `.env.test` and includes only `*.integration.test.ts` files.

- [ ] **Step 1: Create local test environment from example**

Create `.env.test.example`:

```dotenv
NODE_ENV=test
PORT=3001
DATABASE_URL=postgresql://library:library@localhost:5432/library_test?schema=public
FRONTEND_URL=http://localhost:5173
```

Copy it locally to `.env.test`, then create `library_test` in local PostgreSQL and apply existing migrations to it before executing tests.

- [ ] **Step 2: Configure Vitest before test imports**

Create `vitest.integration.config.ts`. Resolve `.env.test` from the API directory, call `dotenv.config` with `override: true`, then export Vitest config with:

```ts
test: {
  include: ["src/**/*.integration.test.ts"],
  fileParallelism: false,
  testTimeout: 10_000,
  hookTimeout: 10_000,
}
```

`fileParallelism: false` keeps cleanup deterministic while all tests share `library_test`.

- [ ] **Step 3: Exclude developer test credentials**

Add `.env.test` to `apps/api/.gitignore`. Keep `.env.test.example` tracked.

- [ ] **Step 4: Add isolated test command**

Add this script to `apps/api/package.json`:

```json
"test:integration": "vitest run --config vitest.integration.config.ts"
```

- [ ] **Step 5: Verify environment isolation**

Run:

```powershell
pnpm --filter @library/api test:integration
```

Expected: Vitest discovers no existing unit tests, loads `NODE_ENV=test`, and connects only to `library_test` after Task 2 adds test file.

### Task 2: Prisma constraint integration tests

**Files:**
- Create: `apps/api/src/modules/auth/auth.persistence.integration.test.ts`

**Interfaces:**
- Consumes: `prisma` from `src/lib/prisma.ts` and generated models `User`, `OAuthAccount`, `Session`.
- Produces: three executable tests proving unique e-mail, unique OAuth identity, and session foreign key enforcement.

- [ ] **Step 1: Write failing duplicate e-mail test**

Create integration suite with `afterEach` cleanup and `afterAll(() => prisma.$disconnect())`. Add:

```ts
test("rejects duplicate user email", async () => {
  const email = "duplicate-email@example.com";

  await prisma.user.create({ data: { email } });

  await expect(prisma.user.create({ data: { email } })).rejects.toMatchObject({
    code: "P2002",
  });
});
```

- [ ] **Step 2: Run test and observe expected failure before migration reaches `library_test`**

Run:

```powershell
pnpm --filter @library/api test:integration
```

Expected: FAIL until auth migration is applied to `library_test`; after migration it must pass and would fail if `User.email` lost unique constraint.

- [ ] **Step 3: Add OAuth composite-uniqueness test**

Add two users. Create account `{ provider: "GOOGLE", providerAccountId: "google-account-1" }` for first, then same provider/account pair for second. Assert second create rejects with `{ code: "P2002" }`.

- [ ] **Step 4: Add session foreign-key test**

Add:

```ts
test("rejects session without existing user", async () => {
  await expect(
    prisma.session.create({
      data: {
        userId: crypto.randomUUID(),
        tokenHash: "hash-without-user",
        expiresAt: new Date("2030-01-01T00:00:00.000Z"),
      },
    }),
  ).rejects.toMatchObject({ code: "P2003" });
});
```

- [ ] **Step 5: Implement deterministic cleanup**

Use this `afterEach` cleanup in test file:

```ts
afterEach(async () => {
  await prisma.session.deleteMany();
  await prisma.oAuthAccount.deleteMany();
  await prisma.user.deleteMany();
});
```

This preserves foreign-key order and makes every case independent.

- [ ] **Step 6: Run integration suite**

Run:

```powershell
pnpm --filter @library/api test:integration
```

Expected: three passing tests.

### Task 3: Full validation

**Files:**
- Verify only; no file changes.

**Interfaces:**
- Consumes: generated Prisma client, migrated `library_test`, unit suite, integration suite.
- Produces: evidence that task acceptance criteria hold.

- [ ] **Step 1: Generate Prisma client**

Run:

```powershell
pnpm --filter @library/api prisma:generate
```

Expected: generated client reflects `User`, `OAuthAccount`, and `Session`.

- [ ] **Step 2: Run static checks**

Run:

```powershell
pnpm typecheck
```

Expected: exit code `0`.

- [ ] **Step 3: Run existing suite**

Run:

```powershell
pnpm test -- --run
```

Expected: existing tests pass without using `library_test`.

- [ ] **Step 4: Run persistence suite**

Run:

```powershell
pnpm --filter @library/api test:integration
```

Expected: all three constraints pass against `library_test`.

- [ ] **Step 5: Inspect change quality**

Run:

```powershell
git diff --check
```

Expected: no whitespace errors.
