import type {
  RecommendationQuizRequest,
  RecommendationQuizResponse,
} from "@library/contracts";
import { AppError } from "../../errors/appError";

export type RecommendationProviderFailureKind =
  | "provider_failure"
  | "invalid_response";

export class RecommendationProviderError extends AppError {
  readonly kind: RecommendationProviderFailureKind;

  constructor(kind: RecommendationProviderFailureKind) {
    super("Não foi possível gerar recomendações", 502, "INTEGRATION_ERROR");
    this.name = "RecommendationProviderError";
    this.kind = kind;
  }
}

export interface RecommendationProvider {
  getRecommendations(
    answers: RecommendationQuizRequest,
  ): Promise<RecommendationQuizResponse>;
}
