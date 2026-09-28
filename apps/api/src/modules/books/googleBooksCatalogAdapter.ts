import { safeParse, z } from "zod";
import { AppError } from "../../errors/appError";
import type { GoogleBookMetadata } from "./googleBooksCatalog";

type GoogleBooksCatalogDependencies = {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

const googleVolumeResponseSchema = z.object({
  volumeInfo: z.object({
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
  }),
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
  };
}
