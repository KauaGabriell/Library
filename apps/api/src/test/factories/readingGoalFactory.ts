import type { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";

type ReadingGoalOverrides = Pick<
  Prisma.ReadingGoalUncheckedCreateInput,
  "userId"
> &
  Partial<Pick<Prisma.ReadingGoalUncheckedCreateInput, "year" | "targetBooks">>;

export function createReadingGoal(overrides: ReadingGoalOverrides) {
  return prisma.readingGoal.create({
    data: {
      year: new Date().getFullYear(),
      targetBooks: 12,
      ...overrides,
    },
  });
}
