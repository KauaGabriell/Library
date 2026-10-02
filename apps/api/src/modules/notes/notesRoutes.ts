import {
  conflictErrorSchema,
  noteParamsSchema,
  noteSchema,
  notFoundErrorSchema,
  publicNoteResponseSchema,
  unauthenticatedErrorSchema,
  validationErrorSchema,
} from "@library/contracts";
import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { AppError } from "../../errors/appError";
import { requireUser } from "../../middlewares/requireUser";
import { mapNoteToPublicResponse } from "./notesMapper";
import { notesService } from "./notesService";

export const notesRoutes: FastifyPluginAsync = async (app) => {
  app.withTypeProvider<ZodTypeProvider>().post("/library/:libraryId/notes", {
    schema: {
      tags: ["Notes"],
      summary: "Cria uma nota",
      body: noteSchema,
      response: {
        201: publicNoteResponseSchema,
        400: validationErrorSchema,
        404: notFoundErrorSchema,
        401: unauthenticatedErrorSchema,
        409: conflictErrorSchema,
      },
      params: noteParamsSchema,
    },
    preHandler: requireUser,
    handler: async (request, reply) => {
      const user = request.user;
      if (!user) throw new AppError("Não autenticado", 401, "UNAUTHENTICATED");

      const { libraryId } = noteParamsSchema.parse(request.params);

      const body = noteSchema.parse(request.body);

      const note = await notesService.createNote({
        libraryEntryId: libraryId,
        content: body.content,
        userId: user.id,
      });

      return reply.status(201).send(mapNoteToPublicResponse(note));
    },
  });
};
