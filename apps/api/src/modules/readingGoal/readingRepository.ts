import type { ReadingGoalInput } from "@library/contracts";
import { getCurrentBusinessYear } from "../../helpers/getCurrencyYear";
import { prisma } from "../../lib/prisma";

export type CreateReadingGoalInput = ReadingGoalInput & {
  userId: string;
};

export const readingGoalRepository = {
  createReadingGoal({ userId, targetBooks }: CreateReadingGoalInput) {
    return prisma.readingGoal.create({
      data: {
        userId,
        year: getCurrentBusinessYear(),
        targetBooks,
      },
    });
  },

  upsertReadingGoal({ userId, targetBooks }: CreateReadingGoalInput) {
    const year = getCurrentBusinessYear();

    return prisma.readingGoal.upsert({
      where: { userId_year: { userId, year } },
      create: { userId, year, targetBooks },
      update: { targetBooks },
    });
  },

  getReadBooks(userId: string) {
    return prisma.libraryEntry.count({
      where: { userId, status: "READ" },
    });
  },

  getUserReadingGoal(userId: string) {
    return prisma.readingGoal.findUnique({
      where: {
        userId_year: {
          userId,
          year: getCurrentBusinessYear(),
        },
      },
    });
  },

  deleteReadingGoal(userId: string) {
    return prisma.readingGoal.delete({
      where: { userId_year: { userId, year: getCurrentBusinessYear() } },
    });
  },
};
