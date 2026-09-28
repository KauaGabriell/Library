import type { BookSearchQuery } from "@library/contracts";
import { safeParse, z } from "zod";
import { AppError } from "../../errors/appError";
import type {
  GoogleBookMetadata,
  GoogleBooksSearchResult,
} from "./googleBooksCatalog";

type GoogleBooksCatalogDependencies = {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

const googleVolumeInfoSchema = z.object({
  title: z.string().min(1),
  authors: z.array(z.string()).optional(),
  description: z.string().optional(),
  imageLinks: z
    .object({
      thumbnail: z.string().optional(),
      smallThumbnail: z.string().optional(),
    })
    .optional(),
  language: z.string().optional(),
  pageCount: z.number().int().positive().optional(),
});

const googleVolumeResponseSchema = z.object({
  volumeInfo: googleVolumeInfoSchema,
});

const googleVolumesSearchResponseSchema = z.object({
  totalItems: z.number().int().nonnegative(),
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        volumeInfo: googleVolumeInfoSchema,
      }),
    )
    .default([]),
});

export function createGoogleBooksCatalog({
  fetchImpl = fetch,
  timeoutMs = 5_000,
}: GoogleBooksCatalogDependencies = {}) {
  return {
    async getById(googleBooksId: string): Promise<GoogleBookMetadata> {
      try {
        const url = new URL(
          `https://www.googleapis.com/books/v1/volumes/${encodeURIComponent(googleBooksId)}`,
        );

        const response = await fetchImpl(url, {
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (response.ok === false)
          throw new AppError("Erro ao buscar livro", 502, "INTEGRATION_ERROR");

        const volumeInfoResponse: unknown = await response.json();

        const parsed = safeParse(
          googleVolumeResponseSchema,
          volumeInfoResponse,
        );

        if (!parsed.success)
          throw new AppError("Erro ao buscar livro", 502, "INTEGRATION_ERROR");

        const { volumeInfo } = parsed.data;
        return {
          title: volumeInfo.title,
          authors: volumeInfo.authors ?? [],
          coverUrl:
            volumeInfo.imageLinks?.thumbnail ??
            volumeInfo.imageLinks?.smallThumbnail ??
            null,
          description: volumeInfo.description ?? null,
          language: volumeInfo.language ?? null,
          pageCount: volumeInfo.pageCount ?? null,
        };
      } catch {
        throw new AppError("Erro ao buscar livro", 502, "INTEGRATION_ERROR");
      }
    },

    async search({
      q,
      page,
      pageSize,
    }: BookSearchQuery): Promise<GoogleBooksSearchResult> {
      try {
        const params = new URLSearchParams({
          q,
          maxResults: String(pageSize),
          startIndex: String((page - 1) * pageSize),
        });
        const url = new URL(
          `https://www.googleapis.com/books/v1/volumes?q=${params}`,
        );

        const startIndex = Number(url.searchParams.get("startIndex"));

        const response = await fetchImpl(url, {
          signal: AbortSignal.timeout(timeoutMs),
        });

        if (response.ok === false)
          throw new AppError("Erro ao buscar livro", 502, "INTEGRATION_ERROR");

        const book = await response.json();
        const parsedBook = safeParse(googleVolumesSearchResponseSchema, book);

        if (parsedBook.success === false)
          throw new AppError("Erro ao buscar livro", 502, "INTEGRATION_ERROR");

        const items = parsedBook.data.items.map((item) => {
          return {
            googleBooksId: item.id,
            title: item.volumeInfo.title,
            authors: item.volumeInfo.authors ?? [],
            coverUrl:
              item.volumeInfo.imageLinks?.thumbnail ??
              item.volumeInfo.imageLinks?.smallThumbnail ??
              null,
            description: item.volumeInfo.description ?? null,
            language: item.volumeInfo.language ?? null,
            pageCount: item.volumeInfo.pageCount ?? null,
          };
        });

        return {
          items: items,
          hasMore:
            items.length > 0 &&
            startIndex + items.length < parsedBook.data.totalItems,
        };
      } catch {
        throw new AppError("Erro ao buscar livro", 502, "INTEGRATION_ERROR");
      }
    },
  };
}
