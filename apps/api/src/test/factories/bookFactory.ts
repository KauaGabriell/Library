import type { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";

type BookOverrides = Partial<
  Pick<
    Prisma.BookUncheckedCreateInput,
    | "googleBooksId"
    | "title"
    | "authors"
    | "description"
    | "coverUrl"
    | "language"
    | "pageCount"
  >
>;

export function createBook(overrides: BookOverrides = {}) {
  return prisma.book.create({
    data: {
      googleBooksId: `test-book-${crypto.randomUUID()}`,
      title: "Livro de teste",
      authors: ["Autor de teste"],
      ...overrides,
    },
  });
}
