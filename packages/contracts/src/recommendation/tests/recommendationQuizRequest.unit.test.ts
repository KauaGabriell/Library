import { recommendationQuizRequestSchema } from "@library/contracts";
import { describe, expect, it } from "vitest";

const validQuizRequest = {
  genres: ["FANTASY", "SCIENCE_FICTION"],
  goal: "LEARN",
  bookLength: "MEDIUM",
  pace: "BALANCED",
  moods: ["INSPIRING"],
  themes: ["ADVENTURE", "MAGIC"],
  avoid: ["EXPLICIT_VIOLENCE"],
};

describe("recommendationQuizRequestSchema", () => {
  it("accepts all seven required answers and optional context", () => {
    expect(
      recommendationQuizRequestSchema.parse({
        ...validQuizRequest,
        additionalContext: "Gostei de Duna pela política e pelo universo.",
      }),
    ).toEqual({
      ...validQuizRequest,
      additionalContext: "Gostei de Duna pela política e pelo universo.",
    });
  });

  it("accepts the seven required answers without additional context", () => {
    expect(recommendationQuizRequestSchema.parse(validQuizRequest)).toEqual(
      validQuizRequest,
    );
  });

  it("rejects a request missing one of the seven answers", () => {
    const { pace: _omittedAnswer, ...incompleteRequest } = validQuizRequest;

    expect(
      recommendationQuizRequestSchema.safeParse(incompleteRequest).success,
    ).toBe(false);
  });

  it.each([
    ["genres", { ...validQuizRequest, genres: [] }],
    ["moods", { ...validQuizRequest, moods: [] }],
    ["themes", { ...validQuizRequest, themes: [] }],
    ["avoid", { ...validQuizRequest, avoid: [] }],
  ])("requires an explicit answer for %s", (_field, request) => {
    expect(recommendationQuizRequestSchema.safeParse(request).success).toBe(
      false,
    );
  });

  it.each([
    ["genre", { ...validQuizRequest, genres: ["FANTASY", "UNKNOWN"] }],
    ["goal", { ...validQuizRequest, goal: "SLEEP" }],
    ["book length", { ...validQuizRequest, bookLength: "HUGE" }],
    ["pace", { ...validQuizRequest, pace: "CHAOTIC" }],
    ["mood", { ...validQuizRequest, moods: ["INSPIRED"] }],
    ["theme", { ...validQuizRequest, themes: ["DRAGONS"] }],
    ["restriction", { ...validQuizRequest, avoid: ["GORE"] }],
  ])("rejects an unsupported %s option", (_field, request) => {
    expect(recommendationQuizRequestSchema.safeParse(request).success).toBe(
      false,
    );
  });

  it.each([
    [
      "more than three genres",
      {
        ...validQuizRequest,
        genres: ["FANTASY", "ROMANCE", "HORROR", "OTHER"],
      },
    ],
    [
      "more than two moods",
      { ...validQuizRequest, moods: ["LIGHT", "COZY", "TENSE"] },
    ],
    [
      "more than three themes",
      {
        ...validQuizRequest,
        themes: ["ADVENTURE", "MAGIC", "HISTORY", "NATURE"],
      },
    ],
  ])("rejects %s", (_description, request) => {
    expect(recommendationQuizRequestSchema.safeParse(request).success).toBe(
      false,
    );
  });

  it("rejects duplicate selections", () => {
    expect(
      recommendationQuizRequestSchema.safeParse({
        ...validQuizRequest,
        genres: ["FANTASY", "FANTASY"],
      }).success,
    ).toBe(false);
  });

  it.each([
    ["genres", { ...validQuizRequest, genres: ["NO_PREFERENCE", "FANTASY"] }],
    ["moods", { ...validQuizRequest, moods: ["NO_PREFERENCE", "LIGHT"] }],
    ["themes", { ...validQuizRequest, themes: ["NO_PREFERENCE", "MAGIC"] }],
    ["avoid", { ...validQuizRequest, avoid: ["NONE", "HORROR"] }],
  ])(
    "requires the no-preference option to be exclusive in %s",
    (_field, request) => {
      expect(recommendationQuizRequestSchema.safeParse(request).success).toBe(
        false,
      );
    },
  );

  it("accepts explicit no-preference answers", () => {
    expect(
      recommendationQuizRequestSchema.safeParse({
        ...validQuizRequest,
        genres: ["NO_PREFERENCE"],
        moods: ["NO_PREFERENCE"],
        themes: ["NO_PREFERENCE"],
        avoid: ["NONE"],
      }).success,
    ).toBe(true);
  });

  it("accepts all restrictions when none is not selected", () => {
    expect(
      recommendationQuizRequestSchema.safeParse({
        ...validQuizRequest,
        avoid: [
          "EXPLICIT_VIOLENCE",
          "HORROR",
          "EXPLICIT_SEXUAL_SCENES",
          "SAD_ENDINGS",
          "HEAVY_TOPICS",
          "SERIES",
        ],
      }).success,
    ).toBe(true);
  });

  it("allows context up to 500 characters and rejects longer context", () => {
    expect(
      recommendationQuizRequestSchema.safeParse({
        ...validQuizRequest,
        additionalContext: "a".repeat(500),
      }).success,
    ).toBe(true);
    expect(
      recommendationQuizRequestSchema.safeParse({
        ...validQuizRequest,
        additionalContext: "a".repeat(501),
      }).success,
    ).toBe(false);
  });

  it("rejects private library data and unknown fields", () => {
    expect(
      recommendationQuizRequestSchema.safeParse({
        ...validQuizRequest,
        notes: ["Anotação privada"],
        review: "Resenha privada",
      }).success,
    ).toBe(false);
  });
});
