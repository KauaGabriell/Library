import type { LibraryEntryCreateInput } from "@library/contracts";
import { prisma } from "../../lib/prisma";
import type { GoogleBookMetadata } from "./googleBooksCatalog";

type ManualBookInput = Extract<LibraryEntryCreateInput, { source: "MANUAL" }>;

export const booksRepository = {
  findGoogleBook(googleBooksId: string) {
    return prisma.book.findUnique({ where: { googleBooksId } });
  },

  createLibraryEntryForBook(userId: string, bookId: string) {
    return prisma.libraryEntry.create({
      data: {
        userId,
        bookId,
        status: "WANT_TO_READ",
        currentPage: 0,
      },
      include: { book: true },
    });
  },

  createGoogleBookAndLibraryEntry(
    userId: string,
    googleBooksId: string,
    metadata: GoogleBookMetadata,
  ) {
    return prisma.$transaction(async (tx) => {
      const book = await tx.book.upsert({
        where: { googleBooksId },
        create: { googleBooksId, ...metadata },
        update: metadata,
      });

      return tx.libraryEntry.create({
        data: {
          userId,
          bookId: book.id,
          status: "WANT_TO_READ",
          currentPage: 0,
        },
        include: { book: true },
      });
    });
  },

  createManualBookAndLibraryEntry(userId: string, input: ManualBookInput) {
    return prisma.$transaction(async (tx) => {
      const book = await tx.book.create({
        data: {
          googleBooksId: null,
          title: input.title,
          authors: input.authors,
          ...(input.description !== undefined
            ? { description: input.description }
            : {}),
          ...(input.coverUrl !== undefined ? { coverUrl: input.coverUrl } : {}),
          ...(input.language !== undefined ? { language: input.language } : {}),
          ...(input.pageCount !== undefined
            ? { pageCount: input.pageCount }
            : {}),
        },
      });

      return tx.libraryEntry.create({
        data: {
          userId,
          bookId: book.id,
          status: "WANT_TO_READ",
          currentPage: 0,
        },
        include: { book: true },
      });
    });
  },
};

export type BooksRepository = typeof booksRepository;
