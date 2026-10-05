import { prisma } from "../../lib/prisma";

export const dashboardRepository = {
  getLibrarysEntries(userId: string) {
    return prisma.libraryEntry.findMany({
      where: { userId: userId },
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: { book: true },
    });
  },

  async getLibraryEntriesStatusCount(userId: string) {
    const [wantToRead, reading, read] = await Promise.all([
      prisma.libraryEntry.count({
        where: { userId: userId, status: "WANT_TO_READ" },
      }),
      prisma.libraryEntry.count({
        where: { userId: userId, status: "READING" },
      }),
      prisma.libraryEntry.count({
        where: { userId: userId, status: "READ" },
      }),
    ]);
    return [wantToRead, reading, read];
  },

  getAvgRating(userId: string) {
    return prisma.libraryEntry.aggregate({
      where: { userId, status: "READ" },
      _avg: { rating: true },
    });
  },
};
