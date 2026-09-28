import {
  type LibraryEntryCreateInput,
  libraryEntryCreateSchema,
} from "@library/contracts";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../../../lib/prisma";
import { createUser as createTestUser } from "../../../test/factories";
import { booksRepository } from "../booksRepository";
import { createBooksService } from "../booksService";
import type {
  GoogleBookMetadata,
  GoogleBooksCatalog,
} from "../googleBooksCatalog";

const createdIds = {
  users: [] as string[],
  books: [] as string[],
  entries: [] as string[],
  googleBooksIds: [] as string[],
  bookTitles: [] as string[],
};

function createCatalog() {
  return {
    getById: vi.fn<GoogleBooksCatalog["getById"]>(),
  } satisfies GoogleBooksCatalog;
}

function createGoogleBookMetadata(
  overrides: Partial<GoogleBookMetadata> = {},
): GoogleBookMetadata {
  return {
    title: "Official Google title",
    authors: ["Official author"],
    description: "Official description",
    coverUrl: "https://books.example/cover.jpg",
    language: "en",
    pageCount: 240,
    ...overrides,
  };
}

function googleBooksInput(googleBooksId: string): LibraryEntryCreateInput {
  return libraryEntryCreateSchema.parse({
    source: "GOOGLE_BOOKS",
    googleBooksId,
  });
}

async function createUser() {
  const user = await createTestUser({
    email: `books-service-${crypto.randomUUID()}@example.com`,
  });
  createdIds.users.push(user.id);
  return user;
}

async function removeCreatedRecords() {
  const booksForCleanup = await prisma.book.findMany({
    where: {
      OR: [
        { id: { in: createdIds.books } },
        { googleBooksId: { in: createdIds.googleBooksIds } },
        { title: { in: createdIds.bookTitles } },
      ],
    },
    select: { id: true },
  });
  const bookIds = booksForCleanup.map(({ id }) => id);

  await prisma.libraryEntry.deleteMany({
    where: {
      OR: [
        { id: { in: createdIds.entries } },
        { userId: { in: createdIds.users } },
        { bookId: { in: bookIds } },
      ],
    },
  });
  await prisma.book.deleteMany({ where: { id: { in: bookIds } } });
  await prisma.user.deleteMany({ where: { id: { in: createdIds.users } } });

  createdIds.entries.length = 0;
  createdIds.books.length = 0;
  createdIds.users.length = 0;
  createdIds.googleBooksIds.length = 0;
  createdIds.bookTitles.length = 0;
}

afterEach(removeCreatedRecords);

afterAll(async () => {
  await prisma.$disconnect();
});

describe("booksService.addToLibrary", () => {
  it("persists Google metadata from the catalog and creates an initial entry", async () => {
    const user = await createUser();
    const googleBooksId = `google-${crypto.randomUUID()}`;
    createdIds.googleBooksIds.push(googleBooksId);
    const metadata = createGoogleBookMetadata();
    const googleBooksCatalog = createCatalog();
    googleBooksCatalog.getById.mockResolvedValue(metadata);
    const booksService = createBooksService({
      repository: booksRepository,
      googleBooksCatalog,
    });

    const entry = await booksService.addToLibrary(
      user.id,
      googleBooksInput(googleBooksId),
    );
    createdIds.entries.push(entry.id);
    createdIds.books.push(entry.book.id);

    expect(googleBooksCatalog.getById).toHaveBeenCalledExactlyOnceWith(
      googleBooksId,
    );
    expect(entry).toMatchObject({
      userId: user.id,
      status: "WANT_TO_READ",
      currentPage: 0,
      book: { googleBooksId, ...metadata },
    });
    await expect(
      prisma.book.findUnique({ where: { googleBooksId } }),
    ).resolves.toMatchObject(metadata);
  });

  it("reuses an existing Google Book across users without another catalog lookup", async () => {
    const firstUser = await createUser();
    const secondUser = await createUser();
    const googleBooksId = `google-${crypto.randomUUID()}`;
    createdIds.googleBooksIds.push(googleBooksId);
    const metadata = createGoogleBookMetadata();
    const googleBooksCatalog = createCatalog();
    googleBooksCatalog.getById.mockResolvedValue(metadata);
    const booksService = createBooksService({
      repository: booksRepository,
      googleBooksCatalog,
    });

    const firstEntry = await booksService.addToLibrary(
      firstUser.id,
      googleBooksInput(googleBooksId),
    );
    createdIds.entries.push(firstEntry.id);
    createdIds.books.push(firstEntry.book.id);

    const secondEntry = await booksService.addToLibrary(
      secondUser.id,
      googleBooksInput(googleBooksId),
    );
    createdIds.entries.push(secondEntry.id);

    expect(secondEntry.book.id).toBe(firstEntry.book.id);
    expect(googleBooksCatalog.getById).toHaveBeenCalledExactlyOnceWith(
      googleBooksId,
    );
    await expect(prisma.book.count({ where: { googleBooksId } })).resolves.toBe(
      1,
    );
  });

  it("keeps one canonical Google Book when two users add it concurrently", async () => {
    const firstUser = await createUser();
    const secondUser = await createUser();
    const googleBooksId = `google-${crypto.randomUUID()}`;
    createdIds.googleBooksIds.push(googleBooksId);
    const metadata = createGoogleBookMetadata();
    const googleBooksCatalog = createCatalog();
    let catalogLookups = 0;
    let releaseCatalogLookups!: () => void;
    const bothCatalogLookupsStarted = new Promise<void>((resolve) => {
      releaseCatalogLookups = resolve;
    });
    googleBooksCatalog.getById.mockImplementation(async () => {
      catalogLookups += 1;
      if (catalogLookups === 2) releaseCatalogLookups();
      await bothCatalogLookupsStarted;
      return metadata;
    });
    const booksService = createBooksService({
      repository: booksRepository,
      googleBooksCatalog,
    });

    const [firstEntry, secondEntry] = await Promise.all([
      booksService.addToLibrary(firstUser.id, googleBooksInput(googleBooksId)),
      booksService.addToLibrary(secondUser.id, googleBooksInput(googleBooksId)),
    ]);
    createdIds.entries.push(firstEntry.id, secondEntry.id);
    createdIds.books.push(firstEntry.book.id, secondEntry.book.id);

    expect(firstEntry.book.id).toBe(secondEntry.book.id);
    await expect(prisma.book.count({ where: { googleBooksId } })).resolves.toBe(
      1,
    );
    await expect(
      prisma.libraryEntry.count({ where: { bookId: firstEntry.book.id } }),
    ).resolves.toBe(2);
  });

  it("creates distinct manual books with empty authors when omitted", async () => {
    const user = await createUser();
    const title = `My manual book ${crypto.randomUUID()}`;
    createdIds.bookTitles.push(title);
    const input = libraryEntryCreateSchema.parse({
      source: "MANUAL",
      title,
    });
    const googleBooksCatalog = createCatalog();
    const booksService = createBooksService({
      repository: booksRepository,
      googleBooksCatalog,
    });

    const firstEntry = await booksService.addToLibrary(user.id, input);
    createdIds.entries.push(firstEntry.id);
    createdIds.books.push(firstEntry.book.id);

    const secondEntry = await booksService.addToLibrary(user.id, input);
    createdIds.entries.push(secondEntry.id);
    createdIds.books.push(secondEntry.book.id);

    expect(firstEntry.book.id).not.toBe(secondEntry.book.id);
    expect(firstEntry.book.googleBooksId).toBeNull();
    expect(firstEntry.book.authors).toEqual([]);
    expect(secondEntry.book.authors).toEqual([]);
    expect(firstEntry.status).toBe("WANT_TO_READ");
    expect(firstEntry.currentPage).toBe(0);
    expect(googleBooksCatalog.getById).not.toHaveBeenCalled();
  });

  it("rejects a second library entry for the same user and Google Book", async () => {
    const user = await createUser();
    const googleBooksId = `google-${crypto.randomUUID()}`;
    createdIds.googleBooksIds.push(googleBooksId);
    const googleBooksCatalog = createCatalog();
    googleBooksCatalog.getById.mockResolvedValue(createGoogleBookMetadata());
    const booksService = createBooksService({
      repository: booksRepository,
      googleBooksCatalog,
    });

    const entry = await booksService.addToLibrary(
      user.id,
      googleBooksInput(googleBooksId),
    );
    createdIds.entries.push(entry.id);
    createdIds.books.push(entry.book.id);

    await expect(
      booksService.addToLibrary(user.id, googleBooksInput(googleBooksId)),
    ).rejects.toMatchObject({ code: "P2002" });

    await expect(
      prisma.libraryEntry.count({ where: { userId: user.id } }),
    ).resolves.toBe(1);
  });

  it("does not persist records when the catalog lookup fails", async () => {
    const user = await createUser();
    const googleBooksId = `google-${crypto.randomUUID()}`;
    createdIds.googleBooksIds.push(googleBooksId);
    const providerError = new Error("Catalog unavailable");
    const googleBooksCatalog = createCatalog();
    googleBooksCatalog.getById.mockRejectedValue(providerError);
    const booksService = createBooksService({
      repository: booksRepository,
      googleBooksCatalog,
    });

    await expect(
      booksService.addToLibrary(user.id, googleBooksInput(googleBooksId)),
    ).rejects.toBe(providerError);

    await expect(prisma.book.count({ where: { googleBooksId } })).resolves.toBe(
      0,
    );
    await expect(
      prisma.libraryEntry.count({ where: { userId: user.id } }),
    ).resolves.toBe(0);
  });

  it("rolls back a manual Book when its LibraryEntry cannot be created", async () => {
    const title = `Rollback manual ${crypto.randomUUID()}`;
    createdIds.bookTitles.push(title);
    const googleBooksCatalog = createCatalog();
    const booksService = createBooksService({
      repository: booksRepository,
      googleBooksCatalog,
    });
    const input = libraryEntryCreateSchema.parse({
      source: "MANUAL",
      title,
    });

    await expect(
      booksService.addToLibrary(crypto.randomUUID(), input),
    ).rejects.toMatchObject({ code: "P2003" });

    await expect(prisma.book.count({ where: { title } })).resolves.toBe(0);
  });
});
