import { afterEach, describe, expect, it, vi } from "vitest";
import { createGoogleBooksCatalog } from "../googleBooksCatalogAdapter";

const apiKey = "test-google-books-api-key";

function createFetchMock(response: Response) {
  return vi.fn<typeof fetch>().mockResolvedValue(response);
}

function createResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

async function expectIntegrationError(operation: Promise<unknown>) {
  await expect(operation).rejects.toMatchObject({
    statusCode: 502,
    code: "INTEGRATION_ERROR",
    message: "Erro ao buscar livro",
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Google Books catalog adapter", () => {
  it("searches with encoded pagination params and maps results", async () => {
    const query = "Dune & science fiction";
    const fetchMock = createFetchMock(
      createResponse({
        totalItems: 21,
        items: [
          {
            id: "google-book-id",
            volumeInfo: {
              title: "Dune",
              authors: ["Frank Herbert"],
              description: "A science fiction novel.",
              imageLinks: {
                thumbnail: "https://books.example/dune.jpg",
              },
              language: "en",
              pageCount: 412,
            },
          },
        ],
      }),
    );
    const catalog = createGoogleBooksCatalog({ fetchImpl: fetchMock });

    await expect(
      catalog.search({ q: query, page: 2, pageSize: 10 }),
    ).resolves.toEqual({
      items: [
        {
          googleBooksId: "google-book-id",
          title: "Dune",
          authors: ["Frank Herbert"],
          description: "A science fiction novel.",
          coverUrl: "https://books.example/dune.jpg",
          language: "en",
          pageCount: 412,
        },
      ],
      hasMore: true,
    });

    const requestUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(requestUrl.searchParams.get("q")).toBe(query);
    expect(requestUrl.searchParams.get("startIndex")).toBe("10");
    expect(requestUrl.searchParams.get("maxResults")).toBe("10");
    expect(requestUrl.searchParams.has("key")).toBe(false);
    const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    expect(headers.get("X-Goog-Api-Key")).toBe(apiKey);
  });

  it("maps zero page count to null without rejecting search results", async () => {
    const fetchMock = createFetchMock(
      createResponse({
        totalItems: 2,
        items: [
          {
            id: "zero-pages",
            volumeInfo: { title: "Unknown pages", pageCount: 0 },
          },
          {
            id: "known-pages",
            volumeInfo: { title: "Known pages", pageCount: 128 },
          },
        ],
      }),
    );
    const catalog = createGoogleBooksCatalog({ fetchImpl: fetchMock });

    await expect(
      catalog.search({ q: "books", page: 1, pageSize: 10 }),
    ).resolves.toMatchObject({
      items: [
        { googleBooksId: "zero-pages", pageCount: null },
        { googleBooksId: "known-pages", pageCount: 128 },
      ],
      hasMore: false,
    });
  });

  it("fetches a volume by encoded ID and maps complete metadata", async () => {
    const googleBooksId = "book/id with spaces?edition=1";
    const fetchMock = createFetchMock(
      createResponse({
        volumeInfo: {
          title: "The Book",
          authors: ["A. Author", "B. Author"],
          description: "Book description",
          imageLinks: {
            thumbnail: "https://books.example/thumbnail.jpg",
            smallThumbnail: "https://books.example/small-thumbnail.jpg",
          },
          language: "en",
          pageCount: 320,
        },
      }),
    );
    const catalog = createGoogleBooksCatalog({ fetchImpl: fetchMock });

    await expect(catalog.getById(googleBooksId)).resolves.toEqual({
      title: "The Book",
      authors: ["A. Author", "B. Author"],
      description: "Book description",
      coverUrl: "https://books.example/thumbnail.jpg",
      language: "en",
      pageCount: 320,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const requestUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(requestUrl.pathname).toBe(
      `/books/v1/volumes/${encodeURIComponent(googleBooksId)}`,
    );
    expect(requestUrl.searchParams.has("key")).toBe(false);
    const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    expect(headers.get("X-Goog-Api-Key")).toBe(apiKey);
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it("maps zero page count to null when fetching a volume by ID", async () => {
    const fetchMock = createFetchMock(
      createResponse({ volumeInfo: { title: "Unknown pages", pageCount: 0 } }),
    );
    const catalog = createGoogleBooksCatalog({ fetchImpl: fetchMock });

    await expect(catalog.getById("zero-pages")).resolves.toMatchObject({
      title: "Unknown pages",
      pageCount: null,
    });
  });

  it("maps omitted authors and metadata to their fallbacks", async () => {
    const fetchMock = createFetchMock(
      createResponse({
        volumeInfo: {
          title: "Partial book",
          imageLinks: {
            smallThumbnail: "https://books.example/small-thumbnail.jpg",
          },
        },
      }),
    );
    const catalog = createGoogleBooksCatalog({ fetchImpl: fetchMock });

    await expect(catalog.getById("partial-book")).resolves.toEqual({
      title: "Partial book",
      authors: [],
      description: null,
      coverUrl: "https://books.example/small-thumbnail.jpg",
      language: null,
      pageCount: null,
    });
  });

  it("uses null when both Google Books cover URLs are absent", async () => {
    const fetchMock = createFetchMock(
      createResponse({ volumeInfo: { title: "No cover book" } }),
    );
    const catalog = createGoogleBooksCatalog({ fetchImpl: fetchMock });

    await expect(catalog.getById("no-cover-book")).resolves.toMatchObject({
      title: "No cover book",
      coverUrl: null,
    });
  });

  it.each([404, 503])(
    "maps Google Books HTTP status %i to an integration error",
    async (status: number) => {
      const fetchMock = createFetchMock(new Response(null, { status }));
      const catalog = createGoogleBooksCatalog({ fetchImpl: fetchMock });

      await expectIntegrationError(catalog.getById("missing-book"));
    },
  );

  it("maps an incompatible provider payload to an integration error", async () => {
    const fetchMock = createFetchMock(createResponse({ volumeInfo: {} }));
    const catalog = createGoogleBooksCatalog({ fetchImpl: fetchMock });

    await expectIntegrationError(catalog.getById("invalid-payload-book"));
  });

  it("maps invalid JSON to an integration error", async () => {
    const fetchMock = createFetchMock(
      new Response("not-json", { status: 200 }),
    );
    const catalog = createGoogleBooksCatalog({ fetchImpl: fetchMock });

    await expectIntegrationError(catalog.getById("invalid-json-book"));
  });

  it("maps network failures to a generic integration error", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new Error("provider network details"));
    const catalog = createGoogleBooksCatalog({ fetchImpl: fetchMock });

    await expectIntegrationError(catalog.getById("network-failure-book"));
  });

  it("maps timeout failures to an integration error", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new DOMException("request timed out", "TimeoutError"));
    const catalog = createGoogleBooksCatalog({
      fetchImpl: fetchMock,
      timeoutMs: 10,
    });

    await expectIntegrationError(catalog.getById("timeout-book"));

    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });
});
