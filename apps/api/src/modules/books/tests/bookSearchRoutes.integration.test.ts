import Fastify, { type FastifyInstance } from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../../../errors/appError";
import { registerErrorHandler } from "../../../middlewares/errorHandling";
import { bookRoutes } from "../bookRoutes";

const catalogMock = vi.hoisted(() => ({
  getById: vi.fn(),
  search: vi.fn(),
}));

vi.mock("../googleBooksCatalogAdapter", () => ({
  createGoogleBooksCatalog: () => catalogMock,
}));

let app: FastifyInstance;

beforeEach(() => {
  vi.clearAllMocks();
  app = Fastify();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  registerErrorHandler(app);
  app.register(bookRoutes, { prefix: "/books" });
});

afterEach(async () => {
  await app.close();
});

describe("GET /books/search", () => {
  it("returns normalized books and the next page without authentication", async () => {
    catalogMock.search.mockResolvedValue({
      items: [
        {
          googleBooksId: "google-book-id",
          title: "Clean Code",
          authors: ["Robert C. Martin"],
          description: null,
          coverUrl: null,
          language: "en",
          pageCount: 464,
        },
      ],
      hasMore: true,
    });

    const response = await app.inject({
      method: "GET",
      url: "/books/search?q=Clean%20Code&page=2&pageSize=10",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      items: [
        {
          googleBooksId: "google-book-id",
          title: "Clean Code",
          authors: ["Robert C. Martin"],
          description: null,
          coverUrl: null,
          language: "en",
          pageCount: 464,
        },
      ],
      page: 2,
      nextPage: 3,
    });
    expect(catalogMock.search).toHaveBeenCalledWith({
      q: "Clean Code",
      page: 2,
      pageSize: 10,
    });
  });

  it("returns an empty successful page when the catalog has no books", async () => {
    catalogMock.search.mockResolvedValue({
      items: [],
      hasMore: false,
    });

    const response = await app.inject({
      method: "GET",
      url: "/books/search?q=unknown",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ items: [], page: 1, nextPage: null });
  });

  it.each([
    ["missing term", "/books/search"],
    ["blank term", "/books/search?q=%20%20"],
    ["invalid page", "/books/search?q=book&page=0"],
    ["invalid page size", "/books/search?q=book&pageSize=41"],
  ])(
    "returns a validation error for %s",
    async (_case: string, url: string) => {
      const response = await app.inject({ method: "GET", url });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
      expect(catalogMock.search).not.toHaveBeenCalled();
    },
  );

  it("returns a standardized integration error when the catalog fails", async () => {
    catalogMock.search.mockRejectedValue(
      new AppError("Erro ao buscar livro", 502, "INTEGRATION_ERROR"),
    );

    const response = await app.inject({
      method: "GET",
      url: "/books/search?q=Clean%20Code",
    });

    expect(response.statusCode).toBe(502);
    expect(response.json()).toEqual({
      code: "INTEGRATION_ERROR",
      message: "Erro ao buscar livro",
    });
  });
});
