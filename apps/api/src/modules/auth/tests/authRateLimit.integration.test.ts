import fastifyRateLimit from "@fastify/rate-limit";
import * as argon2 from "argon2";
import Fastify from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../app";
import { prisma } from "../../../lib/prisma";

const rateLimitError = {
  code: "RATE_LIMITED",
  message: "Muitas tentativas. Tente novamente mais tarde.",
};

async function clearDatabase() {
  await prisma.oAuthAuthorization.deleteMany();
  await prisma.session.deleteMany();
  await prisma.oAuthAccount.deleteMany();
  await prisma.user.deleteMany();
}

function expectRateLimited(response: {
  statusCode: number;
  json: () => unknown;
  headers: Record<string, unknown>;
}) {
  expect(response.statusCode).toBe(429);
  expect(response.json()).toEqual(rateLimitError);
  expect(response.headers["retry-after"]).toMatch(/^\d+$/);
}

beforeAll(clearDatabase);

afterAll(async () => {
  await clearDatabase();
  await app.close();
  await prisma.$disconnect();
});

describe("authentication rate limits", () => {
  it("limits register, login and Google callback independently by IP", async () => {
    const password = "password-for-rate-limit-test";
    await prisma.user.create({
      data: {
        email: "rate-limit-login@example.com",
        passwordHash: await argon2.hash(password),
      },
    });

    const successfulLogin = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "rate-limit-login@example.com", password },
    });
    expect(successfulLogin.statusCode).toBe(200);

    for (let attempt = 0; attempt < 4; attempt++) {
      const failedLogin = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: {
          email: "rate-limit-login@example.com",
          password: "wrong-password-for-test",
        },
      });
      expect(failedLogin.statusCode).toBe(401);
    }

    const sixthLogin = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email: "rate-limit-login@example.com",
        password: "wrong-password-for-test",
      },
    });
    expectRateLimited(sixthLogin);

    const firstRegistration = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {},
    });
    expect(firstRegistration.statusCode).toBe(400);

    const firstCallback = await app.inject({
      method: "GET",
      url: "/auth/google/callback",
    });
    expect(firstCallback.statusCode).toBe(400);

    for (let attempt = 1; attempt < 10; attempt++) {
      const registration = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {},
      });
      expect(registration.statusCode).toBe(400);
    }

    const eleventhRegistration = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {},
    });
    expectRateLimited(eleventhRegistration);

    for (let attempt = 1; attempt < 10; attempt++) {
      const callback = await app.inject({
        method: "GET",
        url: "/auth/google/callback",
      });
      expect(callback.statusCode).toBe(400);
    }

    const eleventhCallback = await app.inject({
      method: "GET",
      url: "/auth/google/callback",
    });
    expectRateLimited(eleventhCallback);
  });
});

describe("rate limit in-memory store isolation", () => {
  it("does not share counters between Fastify instances", async () => {
    const createLimitedApp = async () => {
      const testApp = Fastify({ logger: false });
      await testApp.register(fastifyRateLimit, { global: false });
      testApp.get(
        "/limited",
        {
          config: {
            rateLimit: { max: 1, timeWindow: "15 minutes" },
          },
        },
        async () => ({ ok: true }),
      );
      await testApp.ready();
      return testApp;
    };

    const firstApp = await createLimitedApp();
    const secondApp = await createLimitedApp();

    try {
      expect((await firstApp.inject({ url: "/limited" })).statusCode).toBe(200);
      expect((await firstApp.inject({ url: "/limited" })).statusCode).toBe(429);
      expect((await secondApp.inject({ url: "/limited" })).statusCode).toBe(
        200,
      );
    } finally {
      await Promise.all([firstApp.close(), secondApp.close()]);
    }
  });
});
