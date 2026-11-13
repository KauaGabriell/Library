import {
  MAX_RECOMMENDATION_GENERATIONS_PER_USER_PER_DAY,
  type RecommendationQuizRequest,
  type RecommendationQuizResponse,
  recommendationQuizResponseSchema,
} from "@library/contracts";
import { AppError } from "../../errors/appError";
import type { ProviderCallContext } from "../../observability/providerTelemetry";
import type { RecommendationProvider } from "./recommendationProvider";

type RecommendationsServiceDependencies = {
  provider: RecommendationProvider;
  usage: {
    consumeDailySlots(
      userId: string,
      userDailyLimit: number,
      globalDailyLimit: number,
    ): Promise<"allowed" | "user_limit_reached" | "global_limit_reached">;
  };
  globalDailyLimit: number;
};
export function createRecommendationsService({
  provider,
  usage,
  globalDailyLimit,
}: RecommendationsServiceDependencies) {
  return {
    async getRecommendations(
      userId: string,
      answers: RecommendationQuizRequest,
      context?: ProviderCallContext,
    ): Promise<RecommendationQuizResponse> {
      const usageResult = await usage.consumeDailySlots(
        userId,
        MAX_RECOMMENDATION_GENERATIONS_PER_USER_PER_DAY,
        globalDailyLimit,
      );

      if (usageResult === "user_limit_reached") {
        throw new AppError(
          `Você já atingiu o limite de ${MAX_RECOMMENDATION_GENERATIONS_PER_USER_PER_DAY} tentativas de geração de recomendações de hoje. O limite será renovado à meia-noite (horário de Brasília).`,
          429,
          "RATE_LIMITED",
        );
      }

      if (usageResult === "global_limit_reached") {
        throw new AppError(
          "O limite diário de recomendações do serviço foi atingido. Tente novamente amanhã.",
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
