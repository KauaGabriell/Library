import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const forcedSession = vi.hoisted(() => ({
  token: "token-fixo-para-teste",
  tokenHash: "hash-fixo-para-forcar-colisao",
  expiresAt: new Date("2030-01-01"),
}));

vi.mock("../sessionToken", () => ({
  createSessionToken: vi.fn(() => forcedSession),
}));

import { app } from "../../../app";
import { prisma } from "../../../lib/prisma";

async function clearDatabase() {
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

describe("auth registration transaction", () => {
  it("rolls back the user when session token hash conflicts", async () => {
    const seedUser = await prisma.user.create({
      data: { email: "seed@example.com" },
    });

    await prisma.session.create({
      data: {
        userId: seedUser.id,
        tokenHash: forcedSession.tokenHash,
        expiresAt: forcedSession.expiresAt,
      },
    });

    const response = await app.inject({
      method: "POST",
      path: "/auth/register",
      payload: {
        email: "new-user@example.com",
        password: "secure-password-with-12-characters",
      },
    });

    const newUser = await prisma.user.findUnique({
      where: { email: "new-user@example.com" },
    });

    expect(response.statusCode).toBe(409);
    expect(newUser).toBeNull();
  });
});
