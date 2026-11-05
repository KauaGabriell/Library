import { describe, expect, it, vi } from "vitest";
import type { LibraryEntryCreateInput } from "@library/contracts";
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

describe("booksService.addManualBookWithCover", () => {
  const input: Extract<LibraryEntryCreateInput, { source: "MANUAL" }> = {
    source: "MANUAL",
    title: "Livro manual",
    authors: ["Autora"],
  };
  const image = {
    file: Buffer.from("image-bytes"),
    mimeType: "image/png",
  };

  function createUploadService(repository: BooksRepository) {
    const googleBooksCatalog = {
      getById: vi.fn(),
      search: vi.fn(),
    } as unknown as GoogleBooksCatalog;
    const bookCoverStorage = {
      save: vi.fn().mockResolvedValue({
        filename: "cover.png",
        url: "/books/covers/cover.png",
      }),
      remove: vi.fn().mockResolvedValue(undefined),
      open: vi.fn(),
    };

    return {
      service: createBooksService({
        repository,
        googleBooksCatalog,
        bookCoverStorage,
      }),
      bookCoverStorage,
    };
  }

  it("persists the generated cover URL with the manual book", async () => {
    const repository = {
      ...booksRepository,
      createManualBookAndLibraryEntry: vi.fn().mockResolvedValue({ id: "entry-id" }),
    } as unknown as BooksRepository;
    const { service, bookCoverStorage } = createUploadService(repository);

    await service.addManualBookWithCover("user-id", input, image);

    expect(bookCoverStorage.save).toHaveBeenCalledWith(image.file, image.mimeType);
    expect(repository.createManualBookAndLibraryEntry).toHaveBeenCalledWith(
      "user-id",
      { ...input, coverUrl: "/books/covers/cover.png" },
    );
    expect(bookCoverStorage.remove).not.toHaveBeenCalled();
  });

  it("removes the stored cover when database creation fails", async () => {
    const databaseError = new Error("Database unavailable");
    const repository = {
      ...booksRepository,
      createManualBookAndLibraryEntry: vi.fn().mockRejectedValue(databaseError),
    } as unknown as BooksRepository;
    const { service, bookCoverStorage } = createUploadService(repository);

    await expect(
      service.addManualBookWithCover("user-id", input, image),
    ).rejects.toBe(databaseError);

    expect(bookCoverStorage.remove).toHaveBeenCalledWith("cover.png");
  });
});
