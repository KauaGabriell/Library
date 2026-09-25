import type { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";

type LibraryEntryOverrides = Pick<
  Prisma.LibraryEntryUncheckedCreateInput,
  "userId" | "bookId"
> &
  Partial<
    Pick<
      Prisma.LibraryEntryUncheckedCreateInput,
      "status" | "currentPage" | "rating" | "review"
    >
  >;

export function createLibraryEntry(overrides: LibraryEntryOverrides) {
  return prisma.libraryEntry.create({
    data: {
      status: "WANT_TO_READ",
      ...overrides,
    },
  });
}
