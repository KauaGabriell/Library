import type {
  BookSearchItem,
  RecommendationQuizRequest,
  RecommendationQuizResponse,
} from "@library/contracts";
import { describe, expect, it, vi } from "vitest";
import type { GoogleBooksCatalog } from "../../books/googleBooksCatalog";
import type { RecommendationProvider } from "../recommendationProvider";
import { createRecommendationsService } from "../recommendationsService";

const quizAnswers: RecommendationQuizRequest = {
  genres: ["SCIENCE_FICTION"],
  goal: "REFLECT",
  bookLength: "MEDIUM",
  pace: "CONTEMPLATIVE",
  moods: ["INSPIRING"],
  themes: ["SCIENCE_TECHNOLOGY", "HUMAN_RELATIONSHIPS"],
  avoid: ["EXPLICIT_VIOLENCE"],
};

const providerRecommendations: [
  RecommendationQuizResponse["recommendations"][number],
  RecommendationQuizResponse["recommendations"][number],
  RecommendationQuizResponse["recommendations"][number],
] = [
  {
    title: "Duna",
    author: "Frank Herbert",
    justification: "Combina ficção científica com reflexão política.",
  },
  {
    title: "Kindred",
    author: "Octavia E. Butler",
    justification: "Explora tecnologia e relações humanas.",
  },
  {
    title: "Solaris",
    author: "Stanisław Lem",
    justification: "Oferece uma leitura contemplativa sobre ciência.",
  },
];

const providerResponse: RecommendationQuizResponse = {
  recommendations: providerRecommendations,
};

const catalogBooks: [BookSearchItem, BookSearchItem, BookSearchItem] = [
  {
    googleBooksId: "google-book-1",
    title: "Duna",
    authors: ["Frank Herbert"],
    description: "Uma saga de ficção científica.",
    coverUrl: "https://books.example/dune.jpg",
    language: "pt-BR",
    pageCount: 680,
  },
  {
    googleBooksId: "google-book-2",
    title: "Kindred",
    authors: ["Octavia E. Butler"],
    description: null,
    coverUrl: null,
    language: "en",
    pageCount: null,
  },
  {
    googleBooksId: "google-book-3",
    title: "Solaris",
    authors: ["Stanisław Lem"],
    description: null,
    coverUrl: "https://books.example/solaris.jpg",
    language: "en",
    pageCount: 204,
  },
];

const wrongTitleCatalogBook: BookSearchItem = {
  ...catalogBooks[0],
  googleBooksId: "wrong-title-book",
  title: "Outro livro",
};

const wrongAuthorCatalogBook: BookSearchItem = {
  ...catalogBooks[0],
  googleBooksId: "wrong-author-book",
  authors: ["Outro autor"],
};

function createService() {
  const getRecommendations = vi
    .fn<RecommendationProvider["getRecommendations"]>()
    .mockResolvedValue(providerResponse);
  const getById = vi.fn<GoogleBooksCatalog["getById"]>();
  const search = vi
    .fn<GoogleBooksCatalog["search"]>()
    .mockResolvedValueOnce({ items: [catalogBooks[0]], hasMore: false })
    .mockResolvedValueOnce({ items: [catalogBooks[1]], hasMore: false })
    .mockResolvedValueOnce({ items: [catalogBooks[2]], hasMore: false });
  const provider = { getRecommendations };
  const googleBooksCatalog: GoogleBooksCatalog = {
    getById,
    search,
  };
  const service = createRecommendationsService({
    provider,
    googleBooksCatalog,
  });

  return { service, getRecommendations, getById, search };
}

describe("recommendationsService", () => {
  it("enriches provider suggestions with catalog books and preserves justifications", async () => {
    const { service, getRecommendations, getById, search } = createService();
    search.mockReset();
    search
      .mockResolvedValueOnce({
        items: [wrongTitleCatalogBook, wrongAuthorCatalogBook, catalogBooks[0]],
        hasMore: false,
      })
      .mockResolvedValueOnce({ items: [catalogBooks[1]], hasMore: false })
      .mockResolvedValueOnce({ items: [catalogBooks[2]], hasMore: false });

    await expect(service.getRecommendations(quizAnswers)).resolves.toEqual({
      recommendations: [
        {
          book: catalogBooks[0],
          justification: providerRecommendations[0].justification,
        },
        {
          book: {
            ...catalogBooks[1],
            coverUrl: "http://localhost:5173/book-cover-placeholder.jpg",
          },
          justification: providerRecommendations[1].justification,
        },
        {
          book: catalogBooks[2],
          justification: providerRecommendations[2].justification,
        },
      ],
    });

    expect(getRecommendations).toHaveBeenCalledOnce();
    expect(getRecommendations).toHaveBeenCalledWith(quizAnswers);
    expect(getById).not.toHaveBeenCalled();
    expect(search).toHaveBeenCalledTimes(3);
    expect(search).toHaveBeenNthCalledWith(1, {
      q: 'intitle:"Duna" inauthor:"Frank Herbert"',
      page: 1,
      pageSize: 10,
    });
    expect(search).toHaveBeenNthCalledWith(2, {
      q: 'intitle:"Kindred" inauthor:"Octavia E. Butler"',
      page: 1,
      pageSize: 10,
    });
    expect(search).toHaveBeenNthCalledWith(3, {
      q: 'intitle:"Solaris" inauthor:"Stanisław Lem"',
      page: 1,
      pageSize: 10,
    });
  });

  it("returns an integration error when no result matches both title and author", async () => {
    const { service, search } = createService();
    search.mockReset();
    search
      .mockResolvedValueOnce({
        items: [wrongTitleCatalogBook, wrongAuthorCatalogBook],
        hasMore: false,
      })
      .mockResolvedValueOnce({ items: [catalogBooks[1]], hasMore: false })
      .mockResolvedValueOnce({ items: [catalogBooks[2]], hasMore: false });

    await expect(service.getRecommendations(quizAnswers)).rejects.toMatchObject(
      {
        statusCode: 502,
        code: "INTEGRATION_ERROR",
        message: "Não foi possível gerar recomendações",
      },
    );
  });

  it("uses the public fallback cover when matching catalog entries have no cover", async () => {
    const { service, search } = createService();
    search.mockReset();
    search
      .mockResolvedValueOnce({
        items: [{ ...catalogBooks[0], coverUrl: null }],
        hasMore: false,
      })
      .mockResolvedValueOnce({ items: [catalogBooks[1]], hasMore: false })
      .mockResolvedValueOnce({ items: [catalogBooks[2]], hasMore: false });

    const result = await service.getRecommendations(quizAnswers);

    expect(result.recommendations[0]?.book.coverUrl).toBe(
      "http://localhost:5173/book-cover-placeholder.jpg",
    );
  });

  it("prefers a matching catalog edition with a cover over the fallback", async () => {
    const { service, search } = createService();
    const editionWithCover = {
      ...catalogBooks[0],
      googleBooksId: "dune-edition-with-cover",
    };
    search.mockReset();
    search
      .mockResolvedValueOnce({
        items: [{ ...catalogBooks[0], coverUrl: null }, editionWithCover],
        hasMore: false,
      })
      .mockResolvedValueOnce({ items: [catalogBooks[1]], hasMore: false })
      .mockResolvedValueOnce({ items: [catalogBooks[2]], hasMore: false });

    const result = await service.getRecommendations(quizAnswers);

    expect(result.recommendations[0]?.book).toEqual(editionWithCover);
  });

  it("returns an integration error when a recommended title is absent from the catalog", async () => {
    const { service, search } = createService();
    search.mockReset();
    search
      .mockResolvedValueOnce({ items: [], hasMore: false })
      .mockResolvedValueOnce({ items: [catalogBooks[1]], hasMore: false })
      .mockResolvedValueOnce({ items: [catalogBooks[2]], hasMore: false });

    await expect(service.getRecommendations(quizAnswers)).rejects.toMatchObject(
      {
        statusCode: 502,
        code: "INTEGRATION_ERROR",
        message: "Não foi possível gerar recomendações",
      },
    );
  });

  it("rejects duplicate catalog books after enrichment", async () => {
    const { service, search } = createService();
    search.mockReset();
    search
      .mockResolvedValueOnce({ items: [catalogBooks[0]], hasMore: false })
      .mockResolvedValueOnce({
        items: [
          {
            ...catalogBooks[1],
            googleBooksId: catalogBooks[0].googleBooksId,
          },
        ],
        hasMore: false,
      })
      .mockResolvedValueOnce({ items: [catalogBooks[2]], hasMore: false });

    await expect(service.getRecommendations(quizAnswers)).rejects.toMatchObject(
      {
        statusCode: 502,
        code: "INTEGRATION_ERROR",
        message: "Não foi possível gerar recomendações",
      },
    );
  });

  it("does not search the catalog when the provider fails", async () => {
    const { service, getRecommendations, search } = createService();
    const providerError = new Error("provider error");
    getRecommendations.mockRejectedValue(providerError);

    await expect(service.getRecommendations(quizAnswers)).rejects.toBe(
      providerError,
    );
    expect(search).not.toHaveBeenCalled();
  });
});
