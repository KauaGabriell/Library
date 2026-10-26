import type {
  LibraryEntryListQuery,
  LibraryEntryUpdateInput,
} from "@library/contracts";
import type { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";

export type ListLibraryParams = LibraryEntryListQuery & {
  userId: string;
};

export type UpdateLibraryParams = {
  userId: string;
  libraryId: string;
  patch: LibraryEntryUpdateInput;
};

export type DeleteLibraryParams = {
  userId: string;
  libraryId: string;
};

const libraryEntrySelect = {
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
} as const;

type ListLibraryResult = {
  items: Prisma.LibraryEntryGetPayload<{
    select: typeof libraryEntrySelect;
  }>[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  countsByStatus: {
    WANT_TO_READ: number;
    READING: number;
    READ: number;
  };
};

export const libraryRepository = {
  async listLibrary({
    page: requestedPage,
    userId,
    status,
    pageSize,
    q,
    sortBy,
  }: ListLibraryParams): Promise<ListLibraryResult> {
    const where = {
      userId,
      ...(status !== undefined && { status }),
      ...(q !== undefined && {
        book: { title: { contains: q, mode: "insensitive" as const } },
      }),
    };

    const [totalItems, groupedCounts] = await Promise.all([
      prisma.libraryEntry.count({ where }),
      prisma.libraryEntry.groupBy({
        by: ["status"],
        where: { userId },
        _count: { _all: true },
      }),
    ]);

    const countsByStatus = {
      WANT_TO_READ: 0,
      READING: 0,
      READ: 0,
    };
    for (const group of groupedCounts) {
      countsByStatus[group.status] = group._count._all;
    }

    const totalPages = Math.ceil(totalItems / pageSize);
    const page = Math.min(requestedPage, totalPages || 1);
    const orderBy =
      sortBy === "createdAt"
        ? [{ createdAt: "desc" as const }, { id: "asc" as const }]
        : [{ updatedAt: "desc" as const }, { id: "asc" as const }];

    const items = await prisma.libraryEntry.findMany({
      where,
      select: libraryEntrySelect,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy,
    });

    return { items, page, pageSize, totalItems, totalPages, countsByStatus };
  },

  findById(userId: string, libraryId: string) {
    return prisma.libraryEntry.findUnique({
      where: {
        id: libraryId,
        userId: userId,
      },
      select: libraryEntrySelect,
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
      select: libraryEntrySelect,
    });
  },

  deleteLibrary({ userId, libraryId }: DeleteLibraryParams) {
    return prisma.libraryEntry.delete({
      where: {
        userId: userId,
        id: libraryId,
      },
    });
  },
};
