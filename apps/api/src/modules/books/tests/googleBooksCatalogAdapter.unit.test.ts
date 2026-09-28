import { afterEach, describe, expect, it, vi } from "vitest";
import { createGoogleBooksCatalog } from "../googleBooksCatalogAdapter";

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
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      `https://www.googleapis.com/books/v1/volumes/${encodeURIComponent(googleBooksId)}`,
    );
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
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
    async (status) => {
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
