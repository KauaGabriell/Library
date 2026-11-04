import {
  type RecommendationQuizRequest,
  type RecommendationQuizResponse,
  recommendationQuizResponseSchema,
} from "@library/contracts";
import { AppError } from "../../errors/appError";
import type { RecommendationProvider } from "./recommendationProvider";

type RecommendationsServiceDependencies = { provider: RecommendationProvider };
export function createRecommendationsService({
  provider,
}: RecommendationsServiceDependencies) {
  return {
    async getRecommendations(
      answers: RecommendationQuizRequest,
    ): Promise<RecommendationQuizResponse> {
      const response = await provider.getRecommendations(answers);
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
