import type {
  RecommendationQuizRequest,
  RecommendationQuizResponse,
} from "@library/contracts";
import { describe, expect, it, vi } from "vitest";
import { AppError } from "../../../errors/appError";
import type { RecommendationProvider } from "../recommendationProvider";
import { createRecommendationsService } from "../recommendationsService";

const answers: RecommendationQuizRequest = {
  genres: ["SCIENCE_FICTION"],
  goal: "REFLECT",
  bookLength: "MEDIUM",
  pace: "CONTEMPLATIVE",
  moods: ["INSPIRING"],
  themes: ["SCIENCE_TECHNOLOGY"],
  avoid: ["NONE"],
};
const response: RecommendationQuizResponse = {
  recommendations: [
    {
      title: "Duna",
      author: "Frank Herbert",
      justification: "Reflexão política.",
    },
    {
      title: "Kindred",
      author: "Octavia E. Butler",
      justification: "Questões sociais.",
    },
    {
      title: "Solaris",
      author: "Stanisław Lem",
      justification: "Ciência e reflexão.",
    },
  ],
};
function setup() {
  const getRecommendations = vi
    .fn<RecommendationProvider["getRecommendations"]>()
    .mockResolvedValue(response);
  return {
    getRecommendations,
    service: createRecommendationsService({ provider: { getRecommendations } }),
  };
}
describe("recommendationsService", () => {
  it("returns validated suggestions without catalog metadata", async () => {
    const { service, getRecommendations } = setup();
    await expect(service.getRecommendations(answers)).resolves.toEqual(
      response,
    );
    expect(getRecommendations).toHaveBeenCalledExactlyOnceWith(answers);
  });
  it("propagates provider errors unchanged", async () => {
    const { service, getRecommendations } = setup();
    const error = new AppError(
      "Não foi possível gerar recomendações",
      502,
      "INTEGRATION_ERROR",
    );
    getRecommendations.mockRejectedValue(error);
    await expect(service.getRecommendations(answers)).rejects.toBe(error);
  });
  it.each([
    { recommendations: response.recommendations.slice(0, 2) },
    {
      recommendations: [
        response.recommendations[0],
        response.recommendations[0],
        response.recommendations[2],
      ],
    },
    {
      recommendations: [
        { ...response.recommendations[0], title: " " },
        ...response.recommendations.slice(1),
      ],
    },
  ])("rejects invalid provider output without exposing it", async (invalid) => {
    const { service, getRecommendations } = setup();
    getRecommendations.mockResolvedValue(invalid as RecommendationQuizResponse);
    await expect(service.getRecommendations(answers)).rejects.toMatchObject({
      statusCode: 502,
      code: "INTEGRATION_ERROR",
      message: "Não foi possível gerar recomendações",
    });
  });
});
