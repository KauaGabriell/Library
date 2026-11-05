import { recommendationQuizRequestSchema } from "@library/contracts";
import { describe, expect, it } from "vitest";
import { summarizeRecommendationBenchmark } from "../recommendationBenchmarkMetrics";
import { recommendationBenchmarkProfiles } from "../recommendationBenchmarkProfiles";
import { isRecommendationBenchmarkEnabled } from "../runRecommendationBenchmark";

const quizFields = [
  "genres",
  "goal",
  "bookLength",
  "pace",
  "moods",
  "themes",
  "avoid",
  "additionalContext",
];

describe("recommendation benchmark profiles", () => {
  it("contains eight valid, distinct synthetic profiles", () => {
    expect(recommendationBenchmarkProfiles).toHaveLength(8);
    expect(
      new Set(recommendationBenchmarkProfiles.map(({ id }) => id)).size,
    ).toBe(8);

    for (const { answers } of recommendationBenchmarkProfiles) {
      expect(recommendationQuizRequestSchema.parse(answers)).toEqual(answers);
      expect(
        Object.keys(answers).every((field) => quizFields.includes(field)),
      ).toBe(true);
    }
  });

  it("varies all quiz preference dimensions without user library data", () => {
    const answers = recommendationBenchmarkProfiles.map(
      ({ answers: profileAnswers }) => profileAnswers,
    );
    const dimensions = [
      answers.map(({ genres }) => genres),
      answers.map(({ goal }) => goal),
      answers.map(({ bookLength }) => bookLength),
      answers.map(({ pace }) => pace),
      answers.map(({ moods }) => moods),
      answers.map(({ themes }) => themes),
      answers.map(({ avoid }) => avoid),
    ];

    for (const values of dimensions) {
      expect(
        new Set(values.map((value) => JSON.stringify(value))).size,
      ).toBeGreaterThan(1);
    }

    expect(
      answers.some(({ additionalContext }) => additionalContext !== undefined),
    ).toBe(true);
    expect(quizFields).not.toContain("notes");
    expect(quizFields).not.toContain("review");
    expect(quizFields).not.toContain("libraryEntries");
  });
});

describe("summarizeRecommendationBenchmark", () => {
  it("reports a complete all-valid run", () => {
    const summary = summarizeRecommendationBenchmark(
      Array.from({ length: 8 }, () => ({ kind: "schema_valid" as const })),
    );

    expect(summary).toEqual({
      attempts: 8,
      schemaValidCount: 8,
      schemaInvalidCount: 0,
      providerFailureCount: 0,
      structuredValidRate: 1,
      schemaInvalidRate: 0,
      providerFailureRate: 0,
      complete: true,
    });
  });

  it("computes schema-invalid rate from provider responses only", () => {
    const summary = summarizeRecommendationBenchmark([
      ...Array.from({ length: 6 }, () => ({ kind: "schema_valid" as const })),
      { kind: "schema_invalid" },
      { kind: "provider_failure" },
    ]);

    expect(summary.structuredValidRate).toBe(6 / 8);
    expect(summary.schemaInvalidRate).toBe(1 / 7);
    expect(summary.providerFailureRate).toBe(1 / 8);
    expect(summary.complete).toBe(false);
  });

  it("returns null rates when their denominators are empty", () => {
    expect(summarizeRecommendationBenchmark([])).toEqual({
      attempts: 0,
      schemaValidCount: 0,
      schemaInvalidCount: 0,
      providerFailureCount: 0,
      structuredValidRate: null,
      schemaInvalidRate: null,
      providerFailureRate: null,
      complete: false,
    });
  });
});

describe("isRecommendationBenchmarkEnabled", () => {
  it.each([
    [undefined, false],
    ["", false],
    ["0", false],
    ["true", false],
    ["1", true],
  ])("returns %s for opt-in value %s", (value, expected) => {
    expect(isRecommendationBenchmarkEnabled(value)).toBe(expected);
  });
});
