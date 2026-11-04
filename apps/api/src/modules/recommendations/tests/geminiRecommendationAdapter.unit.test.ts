import type { GoogleGenAI } from "@google/genai";
import type {
  RecommendationQuizRequest,
  RecommendationQuizResponse,
} from "@library/contracts";
import { describe, expect, it, vi } from "vitest";
import { createGeminiRecommendationProvider } from "../geminiRecommendationAdapter";

type GeminiClient = Pick<GoogleGenAI, "models">;

const quizAnswers: RecommendationQuizRequest = {
  genres: ["SCIENCE_FICTION"],
  goal: "REFLECT",
  bookLength: "MEDIUM",
  pace: "CONTEMPLATIVE",
  moods: ["INSPIRING"],
  themes: ["SCIENCE_TECHNOLOGY", "HUMAN_RELATIONSHIPS"],
  avoid: ["EXPLICIT_VIOLENCE"],
  additionalContext: "Gostei de Duna pela política e pelo universo.",
};

const validResponse: RecommendationQuizResponse = {
  recommendations: [
    {
      title: "Duna",
      author: "Frank Herbert",
      justification: "Combina ficção científica e reflexão política.",
    },
    {
      title: "Kindred",
      author: "Octavia E. Butler",
      justification: "Explora tecnologia e relações humanas.",
    },
    {
      title: "Solaris",
      author: "Stanisław Lem",
      justification: "Oferece uma abordagem contemplativa da ciência.",
    },
  ],
};

function createProvider(response: unknown, timeoutMs?: number) {
  const generateContent = vi
    .fn()
    .mockResolvedValue({ text: JSON.stringify(response) });
  const client = { models: { generateContent } } as unknown as GeminiClient;
  const provider = createGeminiRecommendationProvider({
    client,
    model: "test-model",
    ...(timeoutMs === undefined ? {} : { timeoutMs }),
    maxOutputTokens: 900,
  });

  return { provider, generateContent };
}

async function expectIntegrationError(operation: Promise<unknown>) {
  await expect(operation).rejects.toMatchObject({
    statusCode: 502,
    code: "INTEGRATION_ERROR",
    message: "Não foi possível gerar recomendações",
  });
}

describe("Gemini recommendation adapter", () => {
  it("configures Gemini request timeout to 60 seconds", async () => {
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout");
    try {
      const { provider } = createProvider(validResponse);

      await provider.getRecommendations(quizAnswers);

      expect(timeoutSpy).toHaveBeenCalledWith(60_000);
    } finally {
      timeoutSpy.mockRestore();
    }
  });

  it("returns a validated response using only quiz preferences", async () => {
    const { provider, generateContent } = createProvider(validResponse);

    await expect(provider.getRecommendations(quizAnswers)).resolves.toEqual(
      validResponse,
    );

    const [request] = generateContent.mock.calls[0] ?? [];
    expect(request).toMatchObject({
      model: "test-model",
      contents: JSON.stringify(quizAnswers),
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: 900,
        responseJsonSchema: {
          type: "object",
          properties: {
            recommendations: {
              type: "array",
              minItems: 3,
              maxItems: 3,
            },
          },
        },
      },
    });
    expect(request.contents).not.toContain("notes");
    expect(request.contents).not.toContain("libraryEntries");
    expect(request.config.systemInstruction).toContain("três livros distintos");
    expect(request.config.abortSignal).toBeInstanceOf(AbortSignal);
  });

  it("maps an incompatible structured output to a generic integration error", async () => {
    const { provider } = createProvider({ recommendations: [] });

    await expectIntegrationError(provider.getRecommendations(quizAnswers));
  });

  it("maps duplicate recommendations to a generic integration error", async () => {
    const { provider } = createProvider({
      recommendations: [
        validResponse.recommendations[0],
        {
          title: " dUnA ",
          author: "FRANK   HERBERT",
          justification: "Outra justificativa.",
        },
        validResponse.recommendations[1],
      ],
    });

    await expectIntegrationError(provider.getRecommendations(quizAnswers));
  });

  it("maps a missing response text to a generic integration error", async () => {
    const { provider, generateContent } = createProvider(validResponse);
    generateContent.mockResolvedValue({ text: undefined });

    await expectIntegrationError(provider.getRecommendations(quizAnswers));
  });

  it("maps invalid JSON to a generic integration error", async () => {
    const { provider, generateContent } = createProvider(validResponse);
    generateContent.mockResolvedValue({ text: "not-json" });

    await expectIntegrationError(provider.getRecommendations(quizAnswers));
  });

  it("maps a timeout to a generic integration error", async () => {
    const { provider, generateContent } = createProvider(validResponse);
    generateContent.mockRejectedValue(new Error("Gemini request timed out"));

    await expectIntegrationError(provider.getRecommendations(quizAnswers));
    expect(generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          abortSignal: expect.any(AbortSignal),
        }),
      }),
    );
  });

  it("maps provider failures without exposing provider details", async () => {
    const { provider, generateContent } = createProvider(validResponse);
    generateContent.mockRejectedValue(new Error("private provider details"));

    await expectIntegrationError(provider.getRecommendations(quizAnswers));
  });

  it("rejects private library fields before sending anything to Gemini", async () => {
    const { provider, generateContent } = createProvider(validResponse);
    const quizWithPrivateData = {
      ...quizAnswers,
      notes: ["Anotação privada"],
      review: "Resenha privada",
    };

    await expect(
      provider.getRecommendations(quizWithPrivateData),
    ).rejects.toThrow();
    expect(generateContent).not.toHaveBeenCalled();
  });
});
