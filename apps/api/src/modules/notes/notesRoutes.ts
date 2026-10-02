import {
  conflictErrorSchema,
  noteDeleteResponseSchema,
  noteParamsSchema,
  noteSchema,
  notFoundErrorSchema,
  publicNoteResponseSchema,
  unauthenticatedErrorSchema,
  updateAndDeleteNoteParamsSchema,
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

  app.withTypeProvider<ZodTypeProvider>().patch("/notes/:noteId", {
    schema: {
      tags: ["Notes"],
      summary: "Atualiza uma Nota",
      body: noteSchema,
      response: {
        200: publicNoteResponseSchema,
        400: validationErrorSchema,
        404: notFoundErrorSchema,
        401: unauthenticatedErrorSchema,
        409: conflictErrorSchema,
      },
      params: updateAndDeleteNoteParamsSchema,
    },
    preHandler: requireUser,
    handler: async (request, reply) => {
      const user = request.user;
      if (!user) throw new AppError("Não autenticado", 401, "UNAUTHENTICATED");

      const { noteId } = updateAndDeleteNoteParamsSchema.parse(request.params);
      const { content } = noteSchema.parse(request.body);

      const updatedNote = await notesService.updateNote({
        noteId,
        userId: user.id,
        content: content,
      });
      reply.status(200).send(mapNoteToPublicResponse(updatedNote));
    },
  });

  app.withTypeProvider<ZodTypeProvider>().delete("/notes/:noteId", {
    schema: {
      tags: ["Notes"],
      summary: "Deleta uma Nota",
      response: {
        204: noteDeleteResponseSchema,
        400: validationErrorSchema,
        404: notFoundErrorSchema,
        401: unauthenticatedErrorSchema,
        409: conflictErrorSchema,
      },
      params: updateAndDeleteNoteParamsSchema,
    },
    preHandler: requireUser,
    handler: async (request, reply) => {
      const user = request.user;
      if (!user) throw new AppError("Não autenticado", 401, "UNAUTHENTICATED");

      const { noteId } = updateAndDeleteNoteParamsSchema.parse(request.params);
      await notesService.deleteNote(noteId, user.id);
      reply.status(204);
    },
  });
};
