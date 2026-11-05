export type RecommendationBenchmarkOutcome =
  | { kind: "schema_valid" }
  | { kind: "schema_invalid" }
  | { kind: "provider_failure" };

export type RecommendationBenchmarkSummary = {
  attempts: number;
  schemaValidCount: number;
  schemaInvalidCount: number;
  providerFailureCount: number;
  structuredValidRate: number | null;
  schemaInvalidRate: number | null;
  providerFailureRate: number | null;
  complete: boolean;
};

const expectedProfileCount = 8;

function rate(numerator: number, denominator: number) {
  return denominator === 0 ? null : numerator / denominator;
}

export function summarizeRecommendationBenchmark(
  outcomes: readonly RecommendationBenchmarkOutcome[],
): RecommendationBenchmarkSummary {
  const schemaValidCount = outcomes.filter(
    ({ kind }) => kind === "schema_valid",
  ).length;
  const schemaInvalidCount = outcomes.filter(
    ({ kind }) => kind === "schema_invalid",
  ).length;
  const providerFailureCount = outcomes.filter(
    ({ kind }) => kind === "provider_failure",
  ).length;
  const responseCount = schemaValidCount + schemaInvalidCount;
  const attempts = outcomes.length;

  return {
    attempts,
    schemaValidCount,
    schemaInvalidCount,
    providerFailureCount,
    structuredValidRate: rate(schemaValidCount, attempts),
    schemaInvalidRate: rate(schemaInvalidCount, responseCount),
    providerFailureRate: rate(providerFailureCount, attempts),
    complete: attempts >= expectedProfileCount && providerFailureCount === 0,
  };
}
