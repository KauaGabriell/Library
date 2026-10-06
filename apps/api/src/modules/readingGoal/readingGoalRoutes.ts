import {
  conflictErrorSchema,
  notFoundErrorSchema,
  readingGoalDeleteResponseSchema,
  readingGoalResponseSchema,
  readingGoalSchema,
  unauthenticatedErrorSchema,
  validationErrorSchema,
} from "@library/contracts";
import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { AppError } from "../../errors/appError";
import { requireUser } from "../../middlewares/requireUser";
import { readingGoalService } from "./readingGoalService";

export const readingGoalRoutes: FastifyPluginAsync = async (app) => {
  app.withTypeProvider<ZodTypeProvider>().post("/", {
    schema: {
      tags: ["Reading Goal"],
      summary: "Cria um meta de leitura para o usuário",
      body: readingGoalSchema,
      response: {
        201: readingGoalResponseSchema,
        400: validationErrorSchema,
        404: notFoundErrorSchema,
        401: unauthenticatedErrorSchema,
        409: conflictErrorSchema,
      },
    },
    preHandler: requireUser,
    handler: async (request, reply) => {
      const user = request.user;
      if (!user) throw new AppError("Não autenticado", 401, "UNAUTHENTICATED");

      const body = readingGoalSchema.parse(request.body);

      const readingGoal = await readingGoalService.createReadingGoal({
        userId: user.id,
        targetBooks: body.targetBooks,
      });

      reply.status(201).send(readingGoal);
    },
  });

  app.withTypeProvider<ZodTypeProvider>().get("/", {
    schema: {
      tags: ["Reading Goal"],
      summary: "Retorna a meta de leitura do usuário",
      response: {
        200: readingGoalResponseSchema,
        404: notFoundErrorSchema,
        401: unauthenticatedErrorSchema,
      },
    },
    preHandler: requireUser,
    handler: async (request, reply) => {
      const user = request.user;
      if (!user) throw new AppError("Não autenticado", 401, "UNAUTHENTICATED");
      const readingGoal = await readingGoalService.getReadingGoal(user.id);
      if (!readingGoal)
        throw new AppError("Meta de leitura não encontrada", 404, "NOT_FOUND");

      reply.status(200).send(readingGoal);
    },
  });

  app.withTypeProvider<ZodTypeProvider>().put("/", {
    schema: {
      tags: ["Reading Goal"],
      summary: "Atualiza a meta de leitura(livros) do usuário autenticado",
      body: readingGoalSchema,
      response: {
        200: readingGoalResponseSchema,
        404: notFoundErrorSchema,
        401: unauthenticatedErrorSchema,
      },
    },
    preHandler: requireUser,
    handler: async (request, reply) => {
      const user = request.user;
      if (!user) throw new AppError("Não autenticado", 401, "UNAUTHENTICATED");

      const { targetBooks } = readingGoalSchema.parse(request.body);

      const readingGoal = await readingGoalService.upsertReadingGoal({
        userId: user.id,
        targetBooks,
      });
      reply.status(200).send(readingGoal);
    },
  });

  app.withTypeProvider<ZodTypeProvider>().delete("/", {
    schema: {
      tags: ["Reading Goal"],
      summary: "Deleta a meta de leitura do usuário",
      response: {
        204: readingGoalDeleteResponseSchema,
        404: notFoundErrorSchema,
        401: unauthenticatedErrorSchema,
      },
    },
    preHandler: requireUser,
    handler: async (request, reply) => {
      const user = request.user;
      if (!user) throw new AppError("Não autenticado", 401, "UNAUTHENTICATED");

      await readingGoalService.deleteReadingGoal(user.id);
      reply.status(204).send();
    },
  });
};
