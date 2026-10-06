import { createHash, randomUUID } from "node:crypto";
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { app } from "../../../app";
import { AppError } from "../../../errors/appError";
import { prisma } from "../../../lib/prisma";
import {
  createBook,
  createLibraryEntry,
  createUser,
} from "../../../test/factories";

const catalogMock = vi.hoisted(() => ({
  getById: vi.fn(),
  search: vi.fn(),
}));

vi.mock("../../books/googleBooksCatalogAdapter", () => ({
  createGoogleBooksCatalog: () => catalogMock,
}));

const users = new Set<string>();
const createdBookIds = new Set<string>();
const googleBooksIds = new Set<string>();
const manualTitles = new Set<string>();

async function authenticatedUser() {
  const user = await createUser();
  users.add(user.id);
  const token = randomUUID();

  await prisma.session.create({
    data: {
      userId: user.id,
      tokenHash: createHash("sha256").update(token).digest("hex"),
      expiresAt: new Date(Date.now() + 60_000),
    },
  });

  return { user, cookie: `session=${token}` };
}

function googleInput() {
  const googleBooksId = `google-${randomUUID()}`;
  googleBooksIds.add(googleBooksId);
  return { source: "GOOGLE_BOOKS", googleBooksId };
}

function mockGoogleBook() {
  catalogMock.getById.mockResolvedValue({
    title: "Título oficial",
    authors: ["Autor oficial"],
    description: "Descrição oficial",
    coverUrl: "https://example.com/cover.png",
    language: "pt-BR",
    pageCount: 240,
  });
}

async function createLibraryFixture(
  userId: string,
  status: "WANT_TO_READ" | "READING" | "READ" = "WANT_TO_READ",
  options: {
    pageCount?: number | null;
    currentPage?: number | null;
    rating?: number | null;
    review?: string | null;
  } = {},
) {
  const book = await createBook({
    title: `Fixture ${randomUUID()}`,
    ...(options.pageCount !== undefined && { pageCount: options.pageCount }),
  });
  createdBookIds.add(book.id);

  const entry = await createLibraryEntry({
    userId,
    bookId: book.id,
    status,
    ...(options.currentPage !== undefined && {
      currentPage: options.currentPage,
    }),
    ...(options.rating !== undefined && { rating: options.rating }),
    ...(options.review !== undefined && { review: options.review }),
  });

  return { book, entry };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(async () => {
  await prisma.libraryEntry.deleteMany({
    where: { userId: { in: [...users] } },
  });
  await prisma.book.deleteMany({
    where: {
      OR: [
        { id: { in: [...createdBookIds] } },
        { googleBooksId: { in: [...googleBooksIds] } },
        { title: { in: [...manualTitles] } },
      ],
    },
  });
  await prisma.session.deleteMany({ where: { userId: { in: [...users] } } });
  await prisma.user.deleteMany({ where: { id: { in: [...users] } } });
  users.clear();
  createdBookIds.clear();
  googleBooksIds.clear();
  manualTitles.clear();
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

describe("POST /library", () => {
  it("rejects requests without a session", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/library",
      payload: { source: "MANUAL", title: "Livro" },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      code: "UNAUTHENTICATED",
      message: "Não autenticado",
    });
  });

  it("rejects invalid payloads and client-provided owner IDs", async () => {
    const { user, cookie } = await authenticatedUser();

    for (const payload of [
      { source: "MANUAL" },
      { source: "MANUAL", title: "Livro", userId: randomUUID() },
    ]) {
      const response = await app.inject({
        method: "POST",
        url: "/library",
        headers: { cookie },
        payload,
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
    }

    expect(
      await prisma.libraryEntry.count({ where: { userId: user.id } }),
    ).toBe(0);
  });

  it("saves official Google metadata and returns only the public entry", async () => {
    const { user, cookie } = await authenticatedUser();
    const input = googleInput();
    mockGoogleBook();

    const response = await app.inject({
      method: "POST",
      url: "/library",
      headers: { cookie },
      payload: input,
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      id: expect.any(String),
      status: "WANT_TO_READ",
      currentPage: 0,
      progressPercent: null,
      rating: null,
      review: null,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
      book: {
        googleBooksId: input.googleBooksId,
        title: "Título oficial",
        authors: ["Autor oficial"],
        description: "Descrição oficial",
        coverUrl: "https://example.com/cover.png",
        language: "pt-BR",
        pageCount: 240,
      },
    });
    expect(response.json()).not.toHaveProperty("userId");
    expect(response.json()).not.toHaveProperty("bookId");
    expect(response.json().book).not.toHaveProperty("id");
    expect(Date.parse(response.json().createdAt)).not.toBeNaN();
    expect(
      await prisma.libraryEntry.count({ where: { userId: user.id } }),
    ).toBe(1);
  });

  it("returns conflict without another entry for the same user's Google book", async () => {
    const { user, cookie } = await authenticatedUser();
    const input = googleInput();
    mockGoogleBook();

    const first = await app.inject({
      method: "POST",
      url: "/library",
      headers: { cookie },
      payload: input,
    });
    const second = await app.inject({
      method: "POST",
      url: "/library",
      headers: { cookie },
      payload: input,
    });

    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(409);
    expect(second.json()).toMatchObject({ code: "CONFLICT" });
    expect(
      await prisma.libraryEntry.count({ where: { userId: user.id } }),
    ).toBe(1);
    expect(
      await prisma.book.count({
        where: { googleBooksId: input.googleBooksId },
      }),
    ).toBe(1);
  });

  it("shares one Google book between different users", async () => {
    const firstUser = await authenticatedUser();
    const secondUser = await authenticatedUser();
    const input = googleInput();
    mockGoogleBook();

    const first = await app.inject({
      method: "POST",
      url: "/library",
      headers: { cookie: firstUser.cookie },
      payload: input,
    });
    const second = await app.inject({
      method: "POST",
      url: "/library",
      headers: { cookie: secondUser.cookie },
      payload: input,
    });

    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(201);
    expect(first.json().id).not.toBe(second.json().id);
    expect(
      await prisma.book.count({
        where: { googleBooksId: input.googleBooksId },
      }),
    ).toBe(1);
    expect(
      await prisma.libraryEntry.count({
        where: { userId: { in: [firstUser.user.id, secondUser.user.id] } },
      }),
    ).toBe(2);
  });

  it("allows repeated manual books and defaults omitted authors to []", async () => {
    const { user, cookie } = await authenticatedUser();
    const title = `Manual ${randomUUID()}`;
    manualTitles.add(title);
    const payload = { source: "MANUAL", title };

    const first = await app.inject({
      method: "POST",
      url: "/library",
      headers: { cookie },
      payload,
    });
    const second = await app.inject({
      method: "POST",
      url: "/library",
      headers: { cookie },
      payload,
    });

    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(201);
    expect(first.json().book.authors).toEqual([]);
    expect(second.json().book.authors).toEqual([]);
    expect(first.json().id).not.toBe(second.json().id);
    expect(await prisma.book.count({ where: { title } })).toBe(2);
    expect(
      await prisma.libraryEntry.count({ where: { userId: user.id } }),
    ).toBe(2);
    expect(catalogMock.getById).not.toHaveBeenCalled();
  });

  it("returns an integration error without partial data when Google fails", async () => {
    const { user, cookie } = await authenticatedUser();
    const input = googleInput();
    catalogMock.getById.mockRejectedValue(
      new AppError("Catálogo indisponível", 502, "INTEGRATION_ERROR"),
    );

    const response = await app.inject({
      method: "POST",
      url: "/library",
      headers: { cookie },
      payload: input,
    });

    expect(response.statusCode).toBe(502);
    expect(response.json()).toEqual({
      code: "INTEGRATION_ERROR",
      message: "Catálogo indisponível",
    });
    expect(
      await prisma.book.count({
        where: { googleBooksId: input.googleBooksId },
      }),
    ).toBe(0);
    expect(
      await prisma.libraryEntry.count({ where: { userId: user.id } }),
    ).toBe(0);
  });
});

describe("GET /library", () => {
  it("rejects requests without a session", async () => {
    const response = await app.inject({ method: "GET", url: "/library" });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      code: "UNAUTHENTICATED",
      message: "Não autenticado",
    });
  });

  it("returns only the authenticated user's entries in the public shape", async () => {
    const owner = await authenticatedUser();
    const anotherUser = await authenticatedUser();
    const ownFixture = await createLibraryFixture(owner.user.id, "READING");
    const otherFixture = await createLibraryFixture(
      anotherUser.user.id,
      "READING",
    );

    const response = await app.inject({
      method: "GET",
      url: "/library",
      headers: { cookie: owner.cookie },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      items: [
        {
          id: ownFixture.entry.id,
          status: "READING",
          currentPage: 0,
          progressPercent: null,
          rating: null,
          review: null,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
          book: {
            googleBooksId: ownFixture.book.googleBooksId,
            title: ownFixture.book.title,
            authors: ownFixture.book.authors,
            description: ownFixture.book.description,
            coverUrl: ownFixture.book.coverUrl,
            language: ownFixture.book.language,
            pageCount: ownFixture.book.pageCount,
          },
        },
      ],
      page: 1,
      pageSize: 10,
    });
    expect(response.json().items[0].id).not.toBe(otherFixture.entry.id);
    expect(response.json().items[0]).not.toHaveProperty("userId");
    expect(response.json().items[0]).not.toHaveProperty("bookId");
    expect(response.json().items[0].book).not.toHaveProperty("id");
    expect(Date.parse(response.json().items[0].createdAt)).not.toBeNaN();
    expect(Date.parse(response.json().items[0].updatedAt)).not.toBeNaN();
  });

  it("filters entries by status", async () => {
    const { user, cookie } = await authenticatedUser();
    const reading = await createLibraryFixture(user.id, "READING");
    const read = await createLibraryFixture(user.id, "READ");
    await createLibraryFixture(user.id, "WANT_TO_READ");

    const response = await app.inject({
      method: "GET",
      url: "/library?status=READING",
      headers: { cookie },
    });

    expect(response.statusCode).toBe(200);
    expect(
      response.json().items.map((item: { id: string }) => item.id),
    ).toEqual([reading.entry.id]);
    expect(
      response
        .json()
        .items.every((item: { status: string }) => item.status === "READING"),
    ).toBe(true);
    expect(
      response.json().items.map((item: { id: string }) => item.id),
    ).not.toContain(read.entry.id);
  });

  it("uses default pagination values", async () => {
    const { user, cookie } = await authenticatedUser();
    await createLibraryFixture(user.id);

    const response = await app.inject({
      method: "GET",
      url: "/library",
      headers: { cookie },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ page: 1, pageSize: 10 });
  });

  it("returns the requested page and page size", async () => {
    const { user, cookie } = await authenticatedUser();
    const fixtures = await Promise.all([
      createLibraryFixture(user.id),
      createLibraryFixture(user.id),
      createLibraryFixture(user.id),
    ]);

    const firstPage = await app.inject({
      method: "GET",
      url: "/library?page=1&pageSize=2",
      headers: { cookie },
    });
    const secondPage = await app.inject({
      method: "GET",
      url: "/library?page=2&pageSize=2",
      headers: { cookie },
    });

    expect(firstPage.statusCode).toBe(200);
    expect(firstPage.json()).toMatchObject({ page: 1, pageSize: 2 });
    expect(firstPage.json().items).toHaveLength(2);
    expect(secondPage.statusCode).toBe(200);
    expect(secondPage.json()).toMatchObject({ page: 2, pageSize: 2 });
    expect(secondPage.json().items).toHaveLength(1);

    const firstPageIds = firstPage
      .json()
      .items.map((item: { id: string }) => item.id);
    const secondPageIds = secondPage
      .json()
      .items.map((item: { id: string }) => item.id);
    expect(firstPageIds).not.toContain(secondPageIds[0]);
    expect([...firstPageIds, ...secondPageIds].sort()).toEqual(
      fixtures.map(({ entry }) => entry.id).sort(),
    );
  });

  it("orders by most recently updated, then by ID for ties", async () => {
    const { user, cookie } = await authenticatedUser();
    const books = await Promise.all([
      createBook({ title: `Sort fixture ${randomUUID()}` }),
      createBook({ title: `Sort fixture ${randomUUID()}` }),
      createBook({ title: `Sort fixture ${randomUUID()}` }),
    ]);
    books.forEach((book) => {
      createdBookIds.add(book.id);
    });

    const [olderBook, tiedHighIdBook, tiedLowIdBook] = books;
    const olderId = "00000000-0000-4000-8000-000000000003";
    const tiedHighId = "00000000-0000-4000-8000-000000000002";
    const tiedLowId = "00000000-0000-4000-8000-000000000001";
    const olderDate = new Date("2026-09-01T00:00:00.000Z");
    const newerDate = new Date("2026-09-02T00:00:00.000Z");

    await prisma.libraryEntry.createMany({
      data: [
        {
          id: olderId,
          userId: user.id,
          bookId: olderBook.id,
          status: "READING",
          updatedAt: olderDate,
        },
        {
          id: tiedHighId,
          userId: user.id,
          bookId: tiedHighIdBook.id,
          status: "READING",
          updatedAt: newerDate,
        },
        {
          id: tiedLowId,
          userId: user.id,
          bookId: tiedLowIdBook.id,
          status: "READING",
          updatedAt: newerDate,
        },
      ],
    });

    const response = await app.inject({
      method: "GET",
      url: "/library?status=READING",
      headers: { cookie },
    });

    expect(response.statusCode).toBe(200);
    expect(
      response.json().items.map((item: { id: string }) => item.id),
    ).toEqual([tiedLowId, tiedHighId, olderId]);
  });

  it.each([
    ["invalid status", "status=INVALID"],
    ["page below minimum", "page=0"],
    ["page size above maximum", "pageSize=201"],
  ])(
    "returns a validation error for %s",
    async (_description: string, query: string) => {
      const { cookie } = await authenticatedUser();

      const response = await app.inject({
        method: "GET",
        url: `/library?${query}`,
        headers: { cookie },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
    },
  );
});

describe("GET /library/:libraryId", () => {
  it("rejects requests without a session", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/library/${randomUUID()}`,
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      code: "UNAUTHENTICATED",
      message: "Não autenticado",
    });
  });

  it("returns public entry details with notes ordered newest first", async () => {
    const { user, cookie } = await authenticatedUser();
    const { book, entry } = await createLibraryFixture(user.id, "READING");
    const olderCreatedAt = new Date("2026-09-01T10:00:00.000Z");
    const newerCreatedAt = new Date("2026-09-02T10:00:00.000Z");
    const olderNote = await prisma.note.create({
      data: {
        libraryEntryId: entry.id,
        content: "Anotação antiga",
        createdAt: olderCreatedAt,
        updatedAt: olderCreatedAt,
      },
    });
    const newerNote = await prisma.note.create({
      data: {
        libraryEntryId: entry.id,
        content: "Anotação recente",
        createdAt: newerCreatedAt,
        updatedAt: newerCreatedAt,
      },
    });

    const response = await app.inject({
      method: "GET",
      url: `/library/${entry.id}`,
      headers: { cookie },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      id: entry.id,
      status: "READING",
      currentPage: entry.currentPage,
      progressPercent: null,
      rating: null,
      review: null,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
      book: {
        googleBooksId: book.googleBooksId,
        title: book.title,
        authors: book.authors,
        description: book.description,
        coverUrl: book.coverUrl,
        language: book.language,
        pageCount: book.pageCount,
      },
      notes: [
        {
          id: newerNote.id,
          content: newerNote.content,
          createdAt: newerCreatedAt.toISOString(),
          updatedAt: newerCreatedAt.toISOString(),
        },
        {
          id: olderNote.id,
          content: olderNote.content,
          createdAt: olderCreatedAt.toISOString(),
          updatedAt: olderCreatedAt.toISOString(),
        },
      ],
    });
    expect(response.json()).not.toHaveProperty("userId");
    expect(response.json()).not.toHaveProperty("bookId");
    expect(response.json().book).not.toHaveProperty("id");
    expect(response.json().notes[0]).not.toHaveProperty("libraryEntryId");
  });

  it("returns the same not-found response for another user's and missing entries", async () => {
    const owner = await authenticatedUser();
    const otherUser = await authenticatedUser();
    const { entry } = await createLibraryFixture(otherUser.user.id, "READING");

    const foreignResponse = await app.inject({
      method: "GET",
      url: `/library/${entry.id}`,
      headers: { cookie: owner.cookie },
    });
    const missingResponse = await app.inject({
      method: "GET",
      url: `/library/${randomUUID()}`,
      headers: { cookie: owner.cookie },
    });

    expect(foreignResponse.statusCode).toBe(404);
    expect(missingResponse.statusCode).toBe(404);
    expect(foreignResponse.json()).toEqual(missingResponse.json());
    expect(foreignResponse.json()).toEqual({
      code: "NOT_FOUND",
      message: "Leitura não encontrada",
    });
  });

  it("rejects an invalid entry ID", async () => {
    const { cookie } = await authenticatedUser();

    const response = await app.inject({
      method: "GET",
      url: "/library/not-a-uuid",
      headers: { cookie },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
  });
});

describe("PATCH /library/:id", () => {
  it("rejects requests without a session", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: `/library/${randomUUID()}`,
      payload: { status: "READING" },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      code: "UNAUTHENTICATED",
      message: "Não autenticado",
    });
  });

  it("returns floored reading progress percentage in the public response", async () => {
    const { user, cookie } = await authenticatedUser();
    const { entry } = await createLibraryFixture(user.id, "READING", {
      pageCount: 200,
    });

    const response = await app.inject({
      method: "PATCH",
      url: `/library/${entry.id}`,
      headers: { cookie },
      payload: { currentPage: 45 },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      currentPage: 45,
      progressPercent: 22,
    });
  });

  it("allows changing status to READING while setting the current page", async () => {
    const { user, cookie } = await authenticatedUser();
    const { entry } = await createLibraryFixture(user.id, "WANT_TO_READ", {
      pageCount: 200,
    });

    const response = await app.inject({
      method: "PATCH",
      url: `/library/${entry.id}`,
      headers: { cookie },
      payload: { status: "READING", currentPage: 45 },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: "READING",
      currentPage: 45,
      progressPercent: 22,
    });
  });

  it("accepts a current page without a known page count and returns no percentage", async () => {
    const { user, cookie } = await authenticatedUser();
    const { entry } = await createLibraryFixture(user.id, "READING");

    const response = await app.inject({
      method: "PATCH",
      url: `/library/${entry.id}`,
      headers: { cookie },
      payload: { currentPage: 45 },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: "READING",
      currentPage: 45,
      progressPercent: null,
      book: { pageCount: null },
    });
  });

  it("returns the existing entry unchanged when the patch is empty", async () => {
    const { user, cookie } = await authenticatedUser();
    const { book, entry } = await createLibraryFixture(user.id, "READ", {
      pageCount: 240,
      currentPage: 240,
      rating: 4,
      review: "Resenha preservada",
    });

    const response = await app.inject({
      method: "PATCH",
      url: `/library/${entry.id}`,
      headers: { cookie },
      payload: {},
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      id: entry.id,
      status: "READ",
      currentPage: 240,
      progressPercent: 100,
      rating: 4,
      review: "Resenha preservada",
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
      book: {
        googleBooksId: book.googleBooksId,
        title: book.title,
        authors: book.authors,
        description: book.description,
        coverUrl: book.coverUrl,
        language: book.language,
        pageCount: 240,
      },
    });

    const savedEntry = await prisma.libraryEntry.findUniqueOrThrow({
      where: { id: entry.id },
    });
    expect(savedEntry.updatedAt).toEqual(entry.updatedAt);
  });

  it("returns not found for a missing entry with an empty patch", async () => {
    const { cookie } = await authenticatedUser();

    const response = await app.inject({
      method: "PATCH",
      url: `/library/${randomUUID()}`,
      headers: { cookie },
      payload: {},
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      code: "NOT_FOUND",
      message: "Leitura não encontrada",
    });
  });

  it("updates partially and returns the public entry shape", async () => {
    const { user, cookie } = await authenticatedUser();
    const { book, entry } = await createLibraryFixture(user.id, "READ", {
      pageCount: 240,
      currentPage: 240,
      rating: 4,
      review: "Resenha anterior",
    });

    const response = await app.inject({
      method: "PATCH",
      url: `/library/${entry.id}`,
      headers: { cookie },
      payload: { review: "Resenha atualizada" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      id: entry.id,
      status: "READ",
      currentPage: 240,
      progressPercent: 100,
      rating: 4,
      review: "Resenha atualizada",
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
      book: {
        googleBooksId: book.googleBooksId,
        title: book.title,
        authors: book.authors,
        description: book.description,
        coverUrl: book.coverUrl,
        language: book.language,
        pageCount: book.pageCount,
      },
    });
    expect(response.json()).not.toHaveProperty("userId");
    expect(response.json()).not.toHaveProperty("bookId");
    expect(response.json().book).not.toHaveProperty("id");
    expect(Date.parse(response.json().createdAt)).not.toBeNaN();
    expect(Date.parse(response.json().updatedAt)).not.toBeNaN();

    const savedEntry = await prisma.libraryEntry.findUniqueOrThrow({
      where: { id: entry.id },
    });
    expect(savedEntry).toMatchObject({
      status: "READ",
      currentPage: 240,
      rating: 4,
      review: "Resenha atualizada",
    });
  });

  it("allows completing a reading and setting its evaluation together", async () => {
    const { user, cookie } = await authenticatedUser();
    const { entry } = await createLibraryFixture(user.id, "READING", {
      pageCount: 240,
      currentPage: 240,
    });

    const response = await app.inject({
      method: "PATCH",
      url: `/library/${entry.id}`,
      headers: { cookie },
      payload: {
        status: "READ",
        rating: 5,
        review: "Leitura concluída",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      id: entry.id,
      status: "READ",
      currentPage: 240,
      rating: 5,
      review: "Leitura concluída",
    });
    expect(
      await prisma.libraryEntry.findUniqueOrThrow({ where: { id: entry.id } }),
    ).toMatchObject({ status: "READ", rating: 5, review: "Leitura concluída" });
  });

  it("preserves the evaluation when the user starts reading the book again", async () => {
    const { user, cookie } = await authenticatedUser();
    const { entry } = await createLibraryFixture(user.id, "READ", {
      pageCount: 240,
      currentPage: 240,
      rating: 5,
      review: "Quero reler este livro",
    });

    const response = await app.inject({
      method: "PATCH",
      url: `/library/${entry.id}`,
      headers: { cookie },
      payload: { status: "READING" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      id: entry.id,
      status: "READING",
      rating: 5,
      review: "Quero reler este livro",
    });
    expect(
      await prisma.libraryEntry.findUniqueOrThrow({ where: { id: entry.id } }),
    ).toMatchObject({
      status: "READING",
      rating: 5,
      review: "Quero reler este livro",
    });
  });

  it("preserves existing notes when the user changes the reading status", async () => {
    const { user, cookie } = await authenticatedUser();
    const { entry } = await createLibraryFixture(user.id, "READ");
    const note = await prisma.note.create({
      data: {
        libraryEntryId: entry.id,
        content: "Anotação para manter ao reler",
      },
    });

    const response = await app.inject({
      method: "PATCH",
      url: `/library/${entry.id}`,
      headers: { cookie },
      payload: { status: "READING" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: "READING" });
    expect(
      await prisma.note.findUniqueOrThrow({ where: { id: note.id } }),
    ).toMatchObject({
      id: note.id,
      libraryEntryId: entry.id,
      content: "Anotação para manter ao reler",
    });
  });

  it("rejects an invalid body without changing the entry", async () => {
    const { user, cookie } = await authenticatedUser();
    const { entry } = await createLibraryFixture(user.id, "READ", {
      rating: 4,
      review: "Resenha preservada",
    });

    const response = await app.inject({
      method: "PATCH",
      url: `/library/${entry.id}`,
      headers: { cookie },
      payload: { rating: 6 },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
    expect(
      await prisma.libraryEntry.findUniqueOrThrow({ where: { id: entry.id } }),
    ).toMatchObject({
      status: "READ",
      rating: 4,
      review: "Resenha preservada",
    });
  });

  it.each([
    {
      description: "progress outside READING",
      status: "WANT_TO_READ" as const,
      options: { pageCount: 100 },
      patch: { currentPage: 20 },
    },
    {
      description: "progress greater than known page count",
      status: "READING" as const,
      options: { pageCount: 100 },
      patch: { currentPage: 101 },
    },
    {
      description: "rating when resulting status is not READ",
      status: "READING" as const,
      options: {},
      patch: { rating: 4 },
    },
  ])(
    "rejects $description without persisting the patch",
    async (scenario: {
      description: string;
      status: "WANT_TO_READ" | "READING" | "READ";
      options: Parameters<typeof createLibraryFixture>[2];
      patch: { currentPage?: number; rating?: number };
    }) => {
      const { user, cookie } = await authenticatedUser();
      const { entry } = await createLibraryFixture(
        user.id,
        scenario.status,
        scenario.options,
      );

      const response = await app.inject({
        method: "PATCH",
        url: `/library/${entry.id}`,
        headers: { cookie },
        payload: scenario.patch,
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
      expect(
        await prisma.libraryEntry.findUniqueOrThrow({
          where: { id: entry.id },
        }),
      ).toMatchObject({
        status: entry.status,
        currentPage: entry.currentPage,
        rating: entry.rating,
        review: entry.review,
      });
    },
  );

  it("returns the same not-found response for foreign and missing entries", async () => {
    const owner = await authenticatedUser();
    const otherUser = await authenticatedUser();
    const { entry } = await createLibraryFixture(otherUser.user.id);

    const foreignResponse = await app.inject({
      method: "PATCH",
      url: `/library/${entry.id}`,
      headers: { cookie: owner.cookie },
      payload: { status: "READING", currentPage: 20 },
    });
    const missingResponse = await app.inject({
      method: "PATCH",
      url: `/library/${randomUUID()}`,
      headers: { cookie: owner.cookie },
      payload: { status: "READ" },
    });

    expect(foreignResponse.statusCode).toBe(404);
    expect(missingResponse.statusCode).toBe(404);
    expect(foreignResponse.json()).toEqual(missingResponse.json());
    expect(foreignResponse.json()).toEqual({
      code: "NOT_FOUND",
      message: "Leitura não encontrada",
    });
    expect(
      await prisma.libraryEntry.findUniqueOrThrow({ where: { id: entry.id } }),
    ).toMatchObject({ status: "WANT_TO_READ", currentPage: 0 });
  });

  it("rejects an invalid entry ID", async () => {
    const { cookie } = await authenticatedUser();

    const response = await app.inject({
      method: "PATCH",
      url: "/library/not-a-uuid",
      headers: { cookie },
      payload: { status: "READING" },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
  });
});

describe("DELETE /library/:libraryId", () => {
  it("rejects requests without a session", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: `/library/${randomUUID()}`,
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      code: "UNAUTHENTICATED",
      message: "Não autenticado",
    });
  });

  it("deletes the authenticated user's entry and returns no content", async () => {
    const { user, cookie } = await authenticatedUser();
    const { book, entry } = await createLibraryFixture(user.id);

    const response = await app.inject({
      method: "DELETE",
      url: `/library/${entry.id}`,
      headers: { cookie },
    });

    expect(response.statusCode).toBe(204);
    expect(response.body).toBe("");
    expect(
      await prisma.libraryEntry.findUnique({ where: { id: entry.id } }),
    ).toBeNull();
    expect(
      await prisma.book.findUnique({ where: { id: book.id } }),
    ).not.toBeNull();
  });

  it("returns the same not-found response for foreign and missing entries", async () => {
    const owner = await authenticatedUser();
    const otherUser = await authenticatedUser();
    const { entry } = await createLibraryFixture(otherUser.user.id);

    const foreignResponse = await app.inject({
      method: "DELETE",
      url: `/library/${entry.id}`,
      headers: { cookie: owner.cookie },
    });
    const missingResponse = await app.inject({
      method: "DELETE",
      url: `/library/${randomUUID()}`,
      headers: { cookie: owner.cookie },
    });

    expect(foreignResponse.statusCode).toBe(404);
    expect(missingResponse.statusCode).toBe(404);
    expect(foreignResponse.json()).toEqual(missingResponse.json());
    expect(foreignResponse.json()).toEqual({
      code: "NOT_FOUND",
      message: "Leitura não encontrada",
    });
    expect(
      await prisma.libraryEntry.findUniqueOrThrow({ where: { id: entry.id } }),
    ).toMatchObject({ userId: otherUser.user.id, status: "WANT_TO_READ" });
  });

  it("rejects an invalid entry ID", async () => {
    const { cookie } = await authenticatedUser();

    const response = await app.inject({
      method: "DELETE",
      url: "/library/not-a-uuid",
      headers: { cookie },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
  });
});
