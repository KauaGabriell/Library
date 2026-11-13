import {
  type RecommendationQuizRequest,
  type RecommendationQuizResponse,
  recommendationQuizResponseSchema,
} from "@library/contracts";
import { AppError } from "../../errors/appError";
import type { ProviderCallContext } from "../../observability/providerTelemetry";
import type { RecommendationProvider } from "./recommendationProvider";

type RecommendationsServiceDependencies = {
  provider: RecommendationProvider;
  usage: { consumeDailySlot(limit: number): Promise<boolean> };
  dailyLimit: number;
};
export function createRecommendationsService({
  provider,
  usage,
  dailyLimit,
}: RecommendationsServiceDependencies) {
  return {
    async getRecommendations(
      answers: RecommendationQuizRequest,
      context?: ProviderCallContext,
    ): Promise<RecommendationQuizResponse> {
      const hasDailyCapacity = await usage.consumeDailySlot(dailyLimit);
      if (!hasDailyCapacity) {
        throw new AppError(
          "O limite diário de recomendações foi atingido. Tente novamente amanhã.",
          429,
          "RATE_LIMITED",
        );
      }

      const response = context
        ? await provider.getRecommendations(answers, context)
        : await provider.getRecommendations(answers);
      const parsed = recommendationQuizResponseSchema.safeParse(response);
      if (!parsed.success)
        throw new AppError(
          "Não foi possível gerar recomendações",
          502,
          "INTEGRATION_ERROR",
        );
      return parsed.data;
    },
  };
}
