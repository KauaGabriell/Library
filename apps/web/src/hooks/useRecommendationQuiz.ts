import type { RecommendationQuizRequest } from "@library/contracts";
import { useState } from "react";

export type RecommendationQuizDraft = Partial<RecommendationQuizRequest>;

type QuizField = Exclude<keyof RecommendationQuizRequest, "additionalContext">;

export function useRecommendationQuiz() {
  const [draft, setDraft] = useState<RecommendationQuizDraft>({});
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  function updateAnswer<Field extends QuizField>(
    field: Field,
    value: RecommendationQuizRequest[Field],
  ) {
    setDraft((currentDraft) => ({ ...currentDraft, [field]: value }));
  }

  function updateAdditionalContext(value: string) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      additionalContext: value,
    }));
  }

  return {
    draft,
    currentStepIndex,
    setCurrentStepIndex,
    updateAnswer,
    updateAdditionalContext,
  };
}
