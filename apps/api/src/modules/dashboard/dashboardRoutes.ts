import {
  conflictErrorSchema,
  dashboardSummaryResponseSchema,
  notFoundErrorSchema,
  unauthenticatedErrorSchema,
  validationErrorSchema,
} from "@library/contracts";
import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { AppError } from "../../errors/appError";
import { requireUser } from "../../middlewares/requireUser";
import { dashboardService } from "./dashboardService";

export const dashboardRoutes: FastifyPluginAsync = async (app) => {
  app.withTypeProvider<ZodTypeProvider>().get("/dashboard", {
    schema: {
      tags: ["Dashboard"],
      summary: "Retornas as informações do Dashboard",
      response: {
        200: dashboardSummaryResponseSchema,
        400: validationErrorSchema,
        401: unauthenticatedErrorSchema,
        409: conflictErrorSchema,
        404: notFoundErrorSchema,
      },
    },
    preHandler: requireUser,
    handler: async (request, reply) => {
      const user = request.user;
      if (!user) throw new AppError("Não autenticado", 401, "UNAUTHENTICATED");

      const dashboard = await dashboardService.getDashboard(user.id);
      reply.status(200).send(dashboard);
    },
  });
};
