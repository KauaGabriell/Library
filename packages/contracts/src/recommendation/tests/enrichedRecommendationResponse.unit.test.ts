import { enrichedRecommendationResponseSchema } from "@library/contracts";
import { describe, expect, it } from "vitest";

const validResponse = {
  recommendations: [
    {
      book: {
        googleBooksId: "google-book-1",
        title: "Duna",
        authors: ["Frank Herbert"],
        description: "Uma saga de ficção científica.",
        coverUrl: "https://books.example/dune.jpg",
        language: "pt-BR",
        pageCount: 680,
      },
      justification: "Combina ficção científica com reflexão política.",
    },
    {
      book: {
        googleBooksId: "google-book-2",
        title: "Kindred",
        authors: ["Octavia E. Butler"],
        description: null,
        coverUrl: null,
        language: "en",
        pageCount: null,
      },
      justification: "Explora tecnologia e relações humanas.",
    },
    {
      book: {
        googleBooksId: "google-book-3",
        title: "Solaris",
        authors: ["Stanisław Lem"],
        description: null,
        coverUrl: "https://books.example/solaris.jpg",
        language: "en",
        pageCount: 204,
      },
      justification: "Oferece uma leitura contemplativa sobre ciência.",
    },
  ],
};

describe("enrichedRecommendationResponseSchema", () => {
  it("accepts three recommendations with public catalog books", () => {
    expect(enrichedRecommendationResponseSchema.parse(validResponse)).toEqual(
      validResponse,
    );
  });

  it.each([2, 4])("rejects %i enriched recommendations", (count) => {
    const recommendations = Array.from(
      { length: count },
      (_, index) => validResponse.recommendations[index % 3],
    );

    expect(
      enrichedRecommendationResponseSchema.safeParse({ recommendations })
        .success,
    ).toBe(false);
  });

  it("rejects a recommendation without its book or justification", () => {
    expect(
      enrichedRecommendationResponseSchema.safeParse({
        recommendations: [
          {
            book: validResponse.recommendations[0].book,
          },
          ...validResponse.recommendations.slice(1),
        ],
      }).success,
    ).toBe(false);
  });

  it("rejects incomplete catalog book metadata", () => {
    expect(
      enrichedRecommendationResponseSchema.safeParse({
        recommendations: [
          {
            book: {
              googleBooksId: "google-book-1",
              authors: ["Frank Herbert"],
              description: null,
              coverUrl: null,
              language: "en",
              pageCount: null,
            },
            justification: "Justificativa válida.",
          },
          ...validResponse.recommendations.slice(1),
        ],
      }).success,
    ).toBe(false);
  });

  it("rejects blank justifications", () => {
    expect(
      enrichedRecommendationResponseSchema.safeParse({
        recommendations: [
          {
            ...validResponse.recommendations[0],
            justification: "  \t",
          },
          ...validResponse.recommendations.slice(1),
        ],
      }).success,
    ).toBe(false);
  });

  it("rejects duplicate Google Books IDs", () => {
    expect(
      enrichedRecommendationResponseSchema.safeParse({
        recommendations: [
          validResponse.recommendations[0],
          {
            ...validResponse.recommendations[1],
            book: {
              ...validResponse.recommendations[1].book,
              googleBooksId:
                validResponse.recommendations[0].book.googleBooksId,
            },
          },
          validResponse.recommendations[2],
        ],
      }).success,
    ).toBe(false);
  });

  it("rejects extra private or internal fields", () => {
    expect(
      enrichedRecommendationResponseSchema.safeParse({
        ...validResponse,
        libraryEntries: [{ userId: "user-1" }],
      }).success,
    ).toBe(false);

    expect(
      enrichedRecommendationResponseSchema.safeParse({
        recommendations: [
          {
            ...validResponse.recommendations[0],
            book: {
              ...validResponse.recommendations[0].book,
              userId: "user-1",
            },
          },
          ...validResponse.recommendations.slice(1),
        ],
      }).success,
    ).toBe(false);
  });
});
