import type { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";

type UserOverrides = Partial<
  Pick<
    Prisma.UserUncheckedCreateInput,
    "email" | "name" | "passwordHash" | "avatarUrl"
  >
>;

export function createUser(overrides: UserOverrides = {}) {
  return prisma.user.create({
    data: {
      email: `test-user-${crypto.randomUUID()}@example.com`,
      ...overrides,
    },
  });
}
