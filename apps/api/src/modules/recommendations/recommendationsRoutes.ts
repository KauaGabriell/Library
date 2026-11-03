import {
  enrichedRecommendationResponseSchema,
  errorsSchema,
  rateLimitErrorSchema,
  recommendationQuizRequestSchema,
  unauthenticatedErrorSchema,
  validationErrorSchema,
} from "@library/contracts";
import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { recommendationRateLimit } from "../../config/fastify/recommendationRateLimitConfig";
import { AppError } from "../../errors/appError";
import { requireUser } from "../../middlewares/requireUser";
import type { createRecommendationsService } from "./recommendationsService";

type RecommendationsRoutesOptions = {
  recommendationsService: ReturnType<typeof createRecommendationsService>;
};

export const recommendationsRoutes: FastifyPluginAsync<
  RecommendationsRoutesOptions
> = async (app, { recommendationsService }) => {
  app.withTypeProvider<ZodTypeProvider>().post("/", {
    config: {
      rateLimit: recommendationRateLimit,
    },
    schema: {
      tags: ["Recommendations"],
      summary: "Gera recomendações a partir do quiz de leitura",
      body: recommendationQuizRequestSchema,
      response: {
        200: enrichedRecommendationResponseSchema,
        400: validationErrorSchema,
        401: unauthenticatedErrorSchema,
        502: errorsSchema,
        429: rateLimitErrorSchema,
      },
    },
    preHandler: requireUser,
    handler: async (request, reply) => {
      if (!request.user) {
        throw new AppError("Não autenticado", 401, "UNAUTHENTICATED");
      }

      const recommendations = await recommendationsService.getRecommendations(
        request.body,
      );

      return reply.status(200).send(recommendations);
    },
  });
};
