import { describe, expect, it, vi } from "vitest";
import { Prisma } from "../../../generated/prisma/client";
import { type BooksRepository, booksRepository } from "../booksRepository";
import { createBooksService } from "../booksService";
import type { GoogleBooksCatalog } from "../googleBooksCatalog";

function uniqueError(modelName: string, fields: string[]) {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "7.10.0",
    meta: {
      modelName,
      driverAdapterError: {
        cause: { constraint: { fields } },
      },
    },
  });
}

function serviceWithError(error: Error) {
  const repository = {
    ...booksRepository,
    findGoogleBook: vi.fn(async () => ({ id: "existing-book" })),
    createLibraryEntryForBook: vi.fn(async () => {
      throw error;
    }),
  } as unknown as BooksRepository;
  const googleBooksCatalog = {
    getById: vi.fn(),
    search: vi.fn(),
  } as unknown as GoogleBooksCatalog;

  return createBooksService({ repository, googleBooksCatalog });
}

describe("booksService.addToLibrary duplicate mapping", () => {
  const input = {
    source: "GOOGLE_BOOKS",
    googleBooksId: "existing-google-book",
  } as const;

  it("maps only the LibraryEntry bookId/userId constraint to conflict", async () => {
    const error = uniqueError("LibraryEntry", ['"bookId"', '"userId"']);

    await expect(
      serviceWithError(error).addToLibrary("user-id", input),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: "CONFLICT",
    });
  });

  it("does not map a different P2002 target to conflict", async () => {
    const error = uniqueError("Book", ['"googleBooksId"']);

    await expect(
      serviceWithError(error).addToLibrary("user-id", input),
    ).rejects.toBe(error);
  });
});
