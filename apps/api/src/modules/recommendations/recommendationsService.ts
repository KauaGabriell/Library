import {
  type BookSearchItem,
  type EnrichedRecommendationResponse,
  enrichedRecommendationResponseSchema,
  type RecommendationQuizRequest,
} from "@library/contracts";
import { envConfig } from "../../config/env";
import { AppError } from "../../errors/appError";
import type { GoogleBooksCatalog } from "../books/googleBooksCatalog";
import type { RecommendationProvider } from "./recommendationProvider";

type RecommendationsServiceDependencies = {
  provider: RecommendationProvider;
  googleBooksCatalog: GoogleBooksCatalog;
};

const recommendationCoverFallbackUrl = new URL(
  "/book-cover-placeholder.jpg",
  envConfig.FRONTEND_URL,
).toString();

function normalizeBookText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function matchesRecommendation(
  book: BookSearchItem,
  title: string,
  author: string,
) {
  return (
    normalizeBookText(book.title) === normalizeBookText(title) &&
    book.authors.some(
      (bookAuthor) =>
        normalizeBookText(bookAuthor) === normalizeBookText(author),
    )
  );
}

function findMatchingCatalogBook(
  items: BookSearchItem[],
  title: string,
  author: string,
) {
  const matchingBooks = items.filter((book) =>
    matchesRecommendation(book, title, author),
  );

  return (
    matchingBooks.find((book) => book.coverUrl?.trim()) ?? matchingBooks[0]
  );
}

function createRecommendationIntegrationError() {
  return new AppError(
    "Não foi possível gerar recomendações",
    502,
    "INTEGRATION_ERROR",
  );
}

export function createRecommendationsService({
  provider,
  googleBooksCatalog,
}: RecommendationsServiceDependencies) {
  return {
    async getRecommendations(
      answers: RecommendationQuizRequest,
    ): Promise<EnrichedRecommendationResponse> {
      const { recommendations } = await provider.getRecommendations(answers);

      const enrichedRecommendations = await Promise.all(
        recommendations.map(async ({ title, author, justification }) => {
          const { items } = await googleBooksCatalog.search({
            q: `intitle:"${title}" inauthor:"${author}"`,
            page: 1,
            pageSize: 10,
          });

          const book = findMatchingCatalogBook(items, title, author);
          if (!book) throw createRecommendationIntegrationError();

          return {
            book: {
              ...book,
              coverUrl: book.coverUrl?.trim()
                ? book.coverUrl
                : recommendationCoverFallbackUrl,
            },
            justification,
          };
        }),
      );

      const parsed = enrichedRecommendationResponseSchema.safeParse({
        recommendations: enrichedRecommendations,
      });

      if (!parsed.success) throw createRecommendationIntegrationError();

      return parsed.data;
    },
  };
}
