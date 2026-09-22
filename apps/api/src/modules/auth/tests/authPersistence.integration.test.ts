import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { app } from "../../../app";
import { prisma } from "../../../lib/prisma";
import { authRepository } from "../authRepository";

async function clearDatabase() {
  await prisma.oAuthAuthorization.deleteMany();
  await prisma.session.deleteMany();
  await prisma.oAuthAccount.deleteMany();
  await prisma.user.deleteMany();
}

beforeEach(clearDatabase);
afterEach(clearDatabase);

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
});

describe("auth persistence", () => {
  it("rejects duplicate user email", async () => {
    const email = "duplicate-email@example.com";

    await prisma.user.create({ data: { email } });

    await expect(prisma.user.create({ data: { email } })).rejects.toMatchObject(
      {
        code: "P2002",
      },
    );
  });

  it("rejects duplicate OAuth account identity", async () => {
    const firstUser = await prisma.user.create({
      data: { email: "oauth-first@example.com" },
    });
    const secondUser = await prisma.user.create({
      data: { email: "oauth-second@example.com" },
    });

    await prisma.oAuthAccount.create({
      data: {
        provider: "GOOGLE",
        providerAccountId: "google-account-1",
        userId: firstUser.id,
      },
    });

    await expect(
      prisma.oAuthAccount.create({
        data: {
          provider: "GOOGLE",
          providerAccountId: "google-account-1",
          userId: secondUser.id,
        },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("rejects a session without an existing user", async () => {
    await expect(
      prisma.session.create({
        data: {
          expiresAt: new Date("2030-01-01T00:00:00.000Z"),
          tokenHash: "hash-without-user",
          userId: crypto.randomUUID(),
        },
      }),
    ).rejects.toMatchObject({ code: "P2003" });
  });

  it("consumes a valid OAuth authorization", async () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const stateHash = "valid-oauth-state-hash";
    const codeVerifier = "valid-oauth-code-verifier";
    const authorization = await prisma.oAuthAuthorization.create({
      data: {
        provider: "GOOGLE",
        stateHash,
        codeVerifier,
        expiresAt: new Date("2026-01-01T00:05:00.000Z"),
      },
    });

    const result = await authRepository.consumeOAuthAuthorization(prisma, {
      provider: "GOOGLE",
      stateHash,
      now,
    });

    expect(result).toMatchObject({
      id: authorization.id,
      codeVerifier,
      consumedAt: now,
    });

    const persistedAuthorization = await prisma.oAuthAuthorization.findUnique({
      where: { id: authorization.id },
    });

    expect(persistedAuthorization?.consumedAt).toEqual(now);
  });

  it("returns null for an expired OAuth authorization", async () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const stateHash = "valid-oauth-state-hash";
    const codeVerifier = "valid-oauth-code-verifier";
    const authorization = await prisma.oAuthAuthorization.create({
      data: {
        provider: "GOOGLE",
        stateHash,
        codeVerifier,
        expiresAt: new Date("2025-01-01T00:05:00.000Z"),
      },
    });

    const result = await authRepository.consumeOAuthAuthorization(prisma, {
      provider: "GOOGLE",
      stateHash,
      now,
    });

    expect(result).toBe(null);

    const persistedAuthorization = await prisma.oAuthAuthorization.findUnique({
      where: { id: authorization.id },
    });

    expect(persistedAuthorization?.consumedAt).toEqual(null);
  });

  it("returns null for an unknown OAuth authorization", async () => {
    const result = await authRepository.consumeOAuthAuthorization(prisma, {
      provider: "GOOGLE",
      stateHash: "unknown-oauth-state-hash",
      now: new Date("2026-01-01T00:00:00.000Z"),
    });

    expect(result).toBeNull();
  });

  it("returns null when an OAuth authorization is reused", async () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const stateHash = "reused-oauth-state-hash";
    const authorization = await prisma.oAuthAuthorization.create({
      data: {
        provider: "GOOGLE",
        stateHash,
        codeVerifier: "reused-oauth-code-verifier",
        expiresAt: new Date("2026-01-01T00:05:00.000Z"),
      },
    });

    const firstResult = await authRepository.consumeOAuthAuthorization(prisma, {
      provider: "GOOGLE",
      stateHash,
      now,
    });
    const secondResult = await authRepository.consumeOAuthAuthorization(
      prisma,
      {
        provider: "GOOGLE",
        stateHash,
        now,
      },
    );

    expect(firstResult).toMatchObject({ id: authorization.id });
    expect(secondResult).toBeNull();
  });

  it("consumes an OAuth authorization only once under concurrent requests", async () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const stateHash = "concurrent-oauth-state-hash";
    const authorization = await prisma.oAuthAuthorization.create({
      data: {
        provider: "GOOGLE",
        stateHash,
        codeVerifier: "concurrent-oauth-code-verifier",
        expiresAt: new Date("2026-01-01T00:05:00.000Z"),
      },
    });

    const [firstResult, secondResult] = await Promise.all([
      authRepository.consumeOAuthAuthorization(prisma, {
        provider: "GOOGLE",
        stateHash,
        now,
      }),
      authRepository.consumeOAuthAuthorization(prisma, {
        provider: "GOOGLE",
        stateHash,
        now,
      }),
    ]);

    const consumedAuthorizations = [firstResult, secondResult].filter(
      (result) => result !== null,
    );

    expect(consumedAuthorizations).toHaveLength(1);
    expect(consumedAuthorizations[0]).toMatchObject({ id: authorization.id });
  });
});
