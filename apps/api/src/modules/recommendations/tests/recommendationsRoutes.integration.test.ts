import type {
  RecommendationQuizRequest,
  RecommendationQuizResponse,
} from "@library/contracts";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { app } from "../../../app";
import { AppError } from "../../../errors/appError";
import { createSessionToken } from "../../auth/sessionToken";

const recommendationMocks = vi.hoisted(() => ({
  getRecommendations: vi.fn(),
  search: vi.fn(),
}));

const authMocks = vi.hoisted(() => ({
  sessions: new Map<string, unknown>(),
  users: new Map<string, unknown>(),
  sessionFindFirst: vi.fn(),
  userFindUnique: vi.fn(),
}));

vi.mock("../../../lib/prisma", () => ({
  prisma: {
    session: { findFirst: authMocks.sessionFindFirst },
    user: { findUnique: authMocks.userFindUnique },
    $queryRaw: vi.fn(),
  },
}));

vi.mock("../../../plugins/prisma", () => ({
  default: async () => {},
}));

vi.mock("../geminiRecommendationAdapter", () => ({
  createGeminiRecommendationProvider: () => ({
    getRecommendations: recommendationMocks.getRecommendations,
  }),
}));

vi.mock("../../books/googleBooksCatalogAdapter", () => ({
  createGoogleBooksCatalog: () => ({
    getById: vi.fn(),
    search: recommendationMocks.search,
  }),
}));

const quizAnswers: RecommendationQuizRequest = {
  genres: ["SCIENCE_FICTION"],
  goal: "REFLECT",
  bookLength: "MEDIUM",
  pace: "CONTEMPLATIVE",
  moods: ["INSPIRING"],
  themes: ["SCIENCE_TECHNOLOGY"],
  avoid: ["EXPLICIT_VIOLENCE"],
};

const providerRecommendations: RecommendationQuizResponse["recommendations"] = [
  {
    title: "Livro Um",
    author: "Autor Um",
    justification: "Combina com suas preferências de leitura.",
  },
  {
    title: "Livro Dois",
    author: "Autor Dois",
    justification: "Tem o ritmo e os temas que você selecionou.",
  },
  {
    title: "Livro Três",
    author: "Autor Três",
    justification: "É uma opção distinta para explorar esse gênero.",
  },
];

function createAuthenticatedSession() {
  const session = createSessionToken();
  const userId = crypto.randomUUID();

  authMocks.sessions.set(session.tokenHash, {
    userId,
    revokedAt: null,
    expiresAt: session.expiresAt,
  });
  authMocks.users.set(userId, {
    id: userId,
    email: `${userId}@example.com`,
    name: "Test User",
    avatarUrl: null,
  });

  return session.token;
}

beforeEach(() => {
  authMocks.sessions.clear();
  authMocks.users.clear();
  authMocks.sessionFindFirst
    .mockReset()
    .mockImplementation(async ({ where }: { where: { tokenHash: string } }) => {
      const session = authMocks.sessions.get(where.tokenHash);
      if (!session) return null;

      const typedSession = session as {
        revokedAt: Date | null;
        expiresAt: Date;
      };

      if (typedSession.revokedAt || typedSession.expiresAt <= new Date()) {
        return null;
      }

      return session;
    });
  authMocks.userFindUnique
    .mockReset()
    .mockImplementation(
      async ({ where }: { where: { id: string } }) =>
        authMocks.users.get(where.id) ?? null,
    );

  recommendationMocks.getRecommendations
    .mockReset()
    .mockResolvedValue({ recommendations: providerRecommendations });
  recommendationMocks.search
    .mockReset()
    .mockRejectedValue(
      new AppError("Catálogo indisponível", 502, "INTEGRATION_ERROR"),
    );
});

afterAll(async () => {
  await app.close();
});

describe("POST /recommendations", () => {
  it("requires an authenticated session", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/recommendations",
      payload: quizAnswers,
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ code: "UNAUTHENTICATED" });
    expect(recommendationMocks.getRecommendations).not.toHaveBeenCalled();
  });

  it("rejects an invalid quiz before calling the provider", async () => {
    const sessionToken = createAuthenticatedSession();
    const response = await app.inject({
      method: "POST",
      url: "/recommendations",
      headers: { cookie: `session=${sessionToken}` },
      payload: { ...quizAnswers, genres: [] },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
    expect(recommendationMocks.getRecommendations).not.toHaveBeenCalled();
    expect(recommendationMocks.search).not.toHaveBeenCalled();
  });

  it("returns three suggestions even when the catalog is unavailable", async () => {
    const sessionToken = createAuthenticatedSession();
    const response = await app.inject({
      method: "POST",
      url: "/recommendations",
      headers: { cookie: `session=${sessionToken}` },
      payload: quizAnswers,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      recommendations: providerRecommendations,
    });
    expect(recommendationMocks.getRecommendations).toHaveBeenCalledOnce();
    expect(recommendationMocks.getRecommendations).toHaveBeenCalledWith(
      quizAnswers,
    );
    expect(recommendationMocks.search).not.toHaveBeenCalled();
  });

  it("returns a standardized integration error when the provider fails", async () => {
    const sessionToken = createAuthenticatedSession();
    recommendationMocks.getRecommendations.mockRejectedValue(
      new AppError(
        "Não foi possível gerar recomendações",
        502,
        "INTEGRATION_ERROR",
      ),
    );

    const response = await app.inject({
      method: "POST",
      url: "/recommendations",
      headers: { cookie: `session=${sessionToken}` },
      payload: quizAnswers,
    });

    expect(response.statusCode).toBe(502);
    expect(response.json()).toEqual({
      code: "INTEGRATION_ERROR",
      message: "Não foi possível gerar recomendações",
    });
    expect(recommendationMocks.search).not.toHaveBeenCalled();
  });

  it("limits each session independently and returns Retry-After", async () => {
    const firstSession = createAuthenticatedSession();
    const secondSession = createAuthenticatedSession();
    const sendQuiz = (sessionToken: string) =>
      app.inject({
        method: "POST",
        url: "/recommendations",
        headers: { cookie: `session=${sessionToken}` },
        payload: quizAnswers,
      });

    for (let attempt = 0; attempt < 10; attempt++) {
      const response = await sendQuiz(firstSession);
      expect(response.statusCode).toBe(200);
    }

    const exceededResponse = await sendQuiz(firstSession);
    expect(exceededResponse.statusCode).toBe(429);
    expect(exceededResponse.json()).toEqual({
      code: "RATE_LIMITED",
      message: "Muitas tentativas. Tente novamente mais tarde.",
    });
    expect(exceededResponse.headers["retry-after"]).toMatch(/^\d+$/);

    const independentSessionResponse = await sendQuiz(secondSession);
    expect(independentSessionResponse.statusCode).toBe(200);
  });
});
