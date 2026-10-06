import { createHash, randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { app } from "../../../app";
import { prisma } from "../../../lib/prisma";
import { createUser } from "../../../test/factories";

const userIds = new Set<string>();

function getExpectedBusinessYear() {
  return Number(
    new Intl.DateTimeFormat("en", {
      year: "numeric",
      timeZone: "America/Sao_Paulo",
    }).format(new Date()),
  );
}

async function authenticatedUser() {
  const user = await createUser();
  userIds.add(user.id);

  const token = randomUUID();
  await prisma.session.create({
    data: {
      userId: user.id,
      tokenHash: createHash("sha256").update(token).digest("hex"),
      expiresAt: new Date(Date.now() + 60_000),
    },
  });

  return { user, cookie: `session=${token}` };
}

afterEach(async () => {
  if (userIds.size === 0) return;

  await prisma.readingGoal.deleteMany({
    where: { userId: { in: [...userIds] } },
  });
  await prisma.session.deleteMany({
    where: { userId: { in: [...userIds] } },
  });
  await prisma.user.deleteMany({ where: { id: { in: [...userIds] } } });
  userIds.clear();
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

describe("GET /reading-goal", () => {
  it("rejects requests without a session", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/reading-goal",
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ code: "UNAUTHENTICATED" });
  });

  it("returns 404 when the user has no current-year goal", async () => {
    const { cookie } = await authenticatedUser();

    const response = await app.inject({
      method: "GET",
      url: "/reading-goal",
      headers: { cookie },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({
      code: "NOT_FOUND",
      message: "Meta de leitura não encontrada",
    });
  });
});

describe("PUT /reading-goal", () => {
  it("rejects requests without a session", async () => {
    const response = await app.inject({
      method: "PUT",
      url: "/reading-goal",
      payload: { targetBooks: 12, year: 1900 },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ code: "UNAUTHENTICATED" });
  });

  it("creates a goal for the server's current business year without year input", async () => {
    const { user, cookie } = await authenticatedUser();

    const response = await app.inject({
      method: "PUT",
      url: "/reading-goal",
      headers: { cookie },
      payload: { targetBooks: 12 },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      year: getExpectedBusinessYear(),
      targetBooks: 12,
      completedBooks: 0,
      progressPercent: 0,
    });
    await expect(
      prisma.readingGoal.findUnique({
        where: {
          userId_year: {
            userId: user.id,
            year: getExpectedBusinessYear(),
          },
        },
      }),
    ).resolves.toMatchObject({ targetBooks: 12 });
  });

  it("updates the existing current-year goal instead of creating a duplicate", async () => {
    const { user, cookie } = await authenticatedUser();
    const year = getExpectedBusinessYear();

    await prisma.readingGoal.create({
      data: { userId: user.id, year, targetBooks: 5 },
    });

    const response = await app.inject({
      method: "PUT",
      url: "/reading-goal",
      headers: { cookie },
      payload: { targetBooks: 15 },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      year,
      targetBooks: 15,
      completedBooks: 0,
      progressPercent: 0,
    });
    await expect(
      prisma.readingGoal.count({ where: { userId: user.id, year } }),
    ).resolves.toBe(1);
  });

  it.each([0, 1000])(
    "rejects targetBooks=%i without creating a goal",
    async (targetBooks: number) => {
      const { user, cookie } = await authenticatedUser();

      const response = await app.inject({
        method: "PUT",
        url: "/reading-goal",
        headers: { cookie },
        payload: { targetBooks },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
      await expect(
        prisma.readingGoal.count({ where: { userId: user.id } }),
      ).resolves.toBe(0);
    },
  );

  it("keeps goals isolated by owner and current year", async () => {
    const owner = await authenticatedUser();
    const otherUser = await authenticatedUser();
    const currentYear = getExpectedBusinessYear();

    await prisma.readingGoal.create({
      data: {
        userId: owner.user.id,
        year: currentYear - 1,
        targetBooks: 4,
      },
    });

    const ownerWrite = await app.inject({
      method: "PUT",
      url: "/reading-goal",
      headers: { cookie: owner.cookie },
      payload: { targetBooks: 10 },
    });
    const otherUserWrite = await app.inject({
      method: "PUT",
      url: "/reading-goal",
      headers: { cookie: otherUser.cookie },
      payload: { targetBooks: 20 },
    });
    const ownerRead = await app.inject({
      method: "GET",
      url: "/reading-goal",
      headers: { cookie: owner.cookie },
    });
    const otherUserRead = await app.inject({
      method: "GET",
      url: "/reading-goal",
      headers: { cookie: otherUser.cookie },
    });

    expect(ownerWrite.statusCode).toBe(200);
    expect(otherUserWrite.statusCode).toBe(200);
    expect(ownerRead.json()).toMatchObject({ year: currentYear, targetBooks: 10 });
    expect(otherUserRead.json()).toMatchObject({ year: currentYear, targetBooks: 20 });
    await expect(
      prisma.readingGoal.findMany({
        where: { userId: owner.user.id },
        orderBy: { year: "asc" },
        select: { year: true, targetBooks: true },
      }),
    ).resolves.toEqual([
      { year: currentYear - 1, targetBooks: 4 },
      { year: currentYear, targetBooks: 10 },
    ]);
  });
});

describe("DELETE /reading-goal", () => {
  it("rejects requests without a session", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: "/reading-goal",
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ code: "UNAUTHENTICATED" });
  });

  it("deletes only the authenticated user's current-year goal", async () => {
    const owner = await authenticatedUser();
    const otherUser = await authenticatedUser();
    const year = getExpectedBusinessYear();

    await prisma.readingGoal.createMany({
      data: [
        { userId: owner.user.id, year, targetBooks: 10 },
        { userId: otherUser.user.id, year, targetBooks: 20 },
      ],
    });

    const response = await app.inject({
      method: "DELETE",
      url: "/reading-goal",
      headers: { cookie: owner.cookie },
    });

    expect(response.statusCode).toBe(204);
    expect(response.body).toBe("");
    await expect(
      prisma.readingGoal.findUnique({
        where: { userId_year: { userId: owner.user.id, year } },
      }),
    ).resolves.toBeNull();
    await expect(
      prisma.readingGoal.findUnique({
        where: { userId_year: { userId: otherUser.user.id, year } },
      }),
    ).resolves.toMatchObject({ targetBooks: 20 });
  });
});
