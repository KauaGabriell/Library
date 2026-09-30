import type { LibraryEntryListQuery } from "@library/contracts";
import { prisma } from "../../lib/prisma";

export type ListLibraryParams = LibraryEntryListQuery & {
  userId: string;
};

export const libraryRepository = {
  listLibrary({ page, userId, status, pageSize }: ListLibraryParams) {
    return prisma.libraryEntry.findMany({
      where: {
        userId: userId,
        ...(status !== undefined && { status }),
      },
      select: {
        id: true,
        status: true,
        currentPage: true,
        rating: true,
        review: true,
        createdAt: true,
        updatedAt: true,
        book: true,
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
    });
  },
};
