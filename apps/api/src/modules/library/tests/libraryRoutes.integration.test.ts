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
) {
  const book = await createBook({ title: `Fixture ${randomUUID()}` });
  createdBookIds.add(book.id);

  const entry = await createLibraryEntry({
    userId,
    bookId: book.id,
    status,
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
  ])("returns a validation error for %s", async (_description, query) => {
    const { cookie } = await authenticatedUser();

    const response = await app.inject({
      method: "GET",
      url: `/library?${query}`,
      headers: { cookie },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
  });
});
