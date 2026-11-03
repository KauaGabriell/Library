import {
  bookRecommendationSchema,
  recommendationQuizResponseSchema,
} from "@library/contracts";
import { describe, expect, it } from "vitest";

const validRecommendations = [
  {
    title: "Duna",
    author: "Frank Herbert",
    justification: "Combina ficção científica com reflexão política.",
  },
  {
    title: "Kindred",
    author: "Octavia E. Butler",
    justification: "Une ficção científica e questões sociais.",
  },
  {
    title: "A Mão Esquerda da Escuridão",
    author: "Ursula K. Le Guin",
    justification: "Oferece um ritmo contemplativo e temas humanos.",
  },
];

describe("bookRecommendationSchema", () => {
  it("accepts a recommendation and preserves its text", () => {
    const recommendation = {
      title: "  Duna  ",
      author: " Frank Herbert ",
      justification: " Boa recomendação. ",
    };

    expect(bookRecommendationSchema.parse(recommendation)).toEqual(
      recommendation,
    );
  });

  it.each([
    ["title", { author: "Author", justification: "Reason" }],
    ["author", { title: "Title", justification: "Reason" }],
    ["justification", { title: "Title", author: "Author" }],
  ])("requires %s", (_field, recommendation) => {
    expect(bookRecommendationSchema.safeParse(recommendation).success).toBe(
      false,
    );
  });

  it.each([
    ["title", { title: "   ", author: "Author", justification: "Reason" }],
    ["author", { title: "Title", author: "  ", justification: "Reason" }],
    [
      "justification",
      { title: "Title", author: "Author", justification: "\t " },
    ],
  ])("rejects an empty %s", (_field, recommendation) => {
    expect(bookRecommendationSchema.safeParse(recommendation).success).toBe(
      false,
    );
  });

  it("rejects extra fields such as private library data", () => {
    expect(
      bookRecommendationSchema.safeParse({
        ...validRecommendations[0],
        notes: ["Anotação privada"],
      }).success,
    ).toBe(false);
  });
});

describe("recommendationQuizResponseSchema", () => {
  it("accepts exactly three distinct recommendations", () => {
    expect(
      recommendationQuizResponseSchema.parse({
        recommendations: validRecommendations,
      }),
    ).toEqual({ recommendations: validRecommendations });
  });

  it.each([2, 4])("rejects %i recommendations", (count) => {
    expect(
      recommendationQuizResponseSchema.safeParse({
        recommendations: Array.from({ length: count }, (_, index) => ({
          ...validRecommendations[index % validRecommendations.length],
          title: `Book ${index}`,
        })),
      }).success,
    ).toBe(false);
  });

  it("rejects recommendations duplicated after whitespace and case normalization", () => {
    expect(
      recommendationQuizResponseSchema.safeParse({
        recommendations: [
          validRecommendations[0],
          {
            title: " dUnA ",
            author: "FRANK   HERBERT",
            justification: "Outra justificativa.",
          },
          validRecommendations[1],
        ],
      }).success,
    ).toBe(false);
  });

  it("allows the same title from a different author", () => {
    expect(
      recommendationQuizResponseSchema.safeParse({
        recommendations: [
          validRecommendations[0],
          {
            title: "Duna",
            author: "Another Author",
            justification: "Outra obra com o mesmo título.",
          },
          validRecommendations[1],
        ],
      }).success,
    ).toBe(true);
  });

  it("rejects extra response fields", () => {
    expect(
      recommendationQuizResponseSchema.safeParse({
        recommendations: validRecommendations,
        libraryNotes: ["Anotação privada"],
      }).success,
    ).toBe(false);
  });
});
