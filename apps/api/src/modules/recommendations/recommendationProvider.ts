import type {
  RecommendationQuizRequest,
  RecommendationQuizResponse,
} from "@library/contracts";

export interface RecommendationProvider {
  getRecommendations(
    answers: RecommendationQuizRequest,
  ): Promise<RecommendationQuizResponse>;
}
