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
import { createUser } from "../../../test/factories";

const catalogMock = vi.hoisted(() => ({
  getById: vi.fn(),
  search: vi.fn(),
}));

vi.mock("../../books/googleBooksCatalogAdapter", () => ({
  createGoogleBooksCatalog: () => catalogMock,
}));

const users = new Set<string>();
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
        { googleBooksId: { in: [...googleBooksIds] } },
        { title: { in: [...manualTitles] } },
      ],
    },
  });
  await prisma.session.deleteMany({ where: { userId: { in: [...users] } } });
  await prisma.user.deleteMany({ where: { id: { in: [...users] } } });
  users.clear();
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
