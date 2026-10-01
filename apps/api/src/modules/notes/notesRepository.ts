import { prisma } from "../../lib/prisma";

export type NotesListParams = {
  libraryId: string;
  userId: string;
};

const libraryEntryDetailSelect = {
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
  notes: {
    select: {
      id: true,
      content: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
  },
} as const;

export const notesRepository = {
  getDetailById({ libraryId, userId }: NotesListParams) {
    return prisma.libraryEntry.findUnique({
      where: {
        id: libraryId,
        userId: userId,
      },
      select: libraryEntryDetailSelect,
    });
  },
};
