import { GoogleGenAI } from "@google/genai";
import { config as loadDotEnv } from "dotenv";
import { createGeminiRecommendationProvider } from "./geminiRecommendationAdapter";
import {
  type RecommendationBenchmarkOutcome,
  summarizeRecommendationBenchmark,
} from "./recommendationBenchmarkMetrics";
import { recommendationBenchmarkProfiles } from "./recommendationBenchmarkProfiles";
import { RecommendationProviderError } from "./recommendationProvider";

export function isRecommendationBenchmarkEnabled(value: string | undefined) {
  return value === "1";
}

async function runRecommendationBenchmark(): Promise<number> {
  if (
    !isRecommendationBenchmarkEnabled(process.env.RUN_RECOMMENDATION_BENCHMARK)
  ) {
    console.log(
      'Benchmark desativado. Defina RUN_RECOMMENDATION_BENCHMARK="1" para chamar o Gemini.',
    );
    return 0;
  }

  loadDotEnv({ quiet: true });
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY é necessária após ativar o benchmark.");
    return 2;
  }

  const model = process.env.GEMINI_RECOMMENDATION_MODEL ?? "gemini-3.8-flash";
  const provider = createGeminiRecommendationProvider({
    client: new GoogleGenAI({ apiKey }),
    model,
  });
  const outcomes: RecommendationBenchmarkOutcome[] = [];

  console.log(
    "Revisão manual: aprove cada justificativa que conecte a obra a uma preferência e respeite as restrições.",
  );

  for (const profile of recommendationBenchmarkProfiles) {
    try {
      const result = await provider.getRecommendations(profile.answers);
      outcomes.push({ kind: "schema_valid" });
      console.log(
        JSON.stringify({
          profileId: profile.id,
          syntheticAnswers: profile.answers,
          recommendations: result.recommendations,
        }),
      );
    } catch (error) {
      const kind =
        error instanceof RecommendationProviderError
          ? error.kind
          : "provider_failure";
      const outcomeKind = kind === "provider_failure" ? kind : "schema_invalid";
      outcomes.push({ kind: outcomeKind });
      console.error(
        JSON.stringify({ profileId: profile.id, outcome: outcomeKind }),
      );
    }
  }

  const summary = summarizeRecommendationBenchmark(outcomes);
  console.log(
    JSON.stringify(
      {
        runAt: new Date().toISOString(),
        model,
        ...summary,
        schemaReleaseGatePassed: summary.schemaInvalidCount === 0,
      },
      null,
      2,
    ),
  );

  if (
    !summary.complete ||
    summary.providerFailureCount > 0 ||
    summary.schemaInvalidCount > 0
  ) {
    return 1;
  }

  return 0;
}

if (require.main === module) {
  void runRecommendationBenchmark()
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch(() => {
      console.error("Benchmark interrompido por falha interna.");
      process.exitCode = 1;
    });
}
