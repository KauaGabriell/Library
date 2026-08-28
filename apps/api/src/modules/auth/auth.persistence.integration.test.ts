import { afterAll, afterEach, beforeEach, expect, test } from "vitest";
import { prisma } from "../../lib/prisma";

async function clearDatabase() {
  await prisma.session.deleteMany();
  await prisma.oAuthAccount.deleteMany();
  await prisma.user.deleteMany();
}

beforeEach(clearDatabase);
afterEach(clearDatabase);

afterAll(async () => {
  await prisma.$disconnect();
});

test("rejects duplicate user email", async () => {
  const email = "duplicate-email@example.com";

  await prisma.user.create({ data: { email } });

  await expect(prisma.user.create({ data: { email } })).rejects.toMatchObject({
    code: "P2002",
  });
});

test("rejects duplicate OAuth account identity", async () => {
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

test("rejects session without an existing user", async () => {
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
