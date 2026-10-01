import type {
  LibraryEntryListQuery,
  LibraryEntryUpdateInput,
} from "@library/contracts";
import { prisma } from "../../lib/prisma";

export type ListLibraryParams = LibraryEntryListQuery & {
  userId: string;
};

export type UpdateLibraryParams = {
  userId: string;
  libraryId: string;
  patch: LibraryEntryUpdateInput;
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

  findById(userId: string, libraryId: string) {
    return prisma.libraryEntry.findUnique({
      where: {
        id: libraryId,
        userId: userId,
      },
      select: {
        id: true,
        status: true,
        currentPage: true,
        rating: true,
        review: true,
        book: { select: { pageCount: true } },
      },
    });
  },

  updateLibrary({ userId, libraryId, patch }: UpdateLibraryParams) {
    return prisma.libraryEntry.update({
      where: {
        userId,
        id: libraryId,
      },
      data: {
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.currentPage !== undefined
          ? { currentPage: patch.currentPage }
          : {}),
        ...(patch.rating !== undefined ? { rating: patch.rating } : {}),
        ...(patch.review !== undefined ? { review: patch.review } : {}),
      },
      select: {
        id: true,
        status: true,
        currentPage: true,
        rating: true,
        review: true,
        createdAt: true,
        updatedAt: true,
        book: {
          select: {
            googleBooksId: true,
            title: true,
            authors: true,
            description: true,
            coverUrl: true,
            language: true,
            pageCount: true,
          },
        },
      },
    });
  },
};
