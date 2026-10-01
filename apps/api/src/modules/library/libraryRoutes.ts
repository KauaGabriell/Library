import {
  conflictErrorSchema,
  libraryEntryCreateSchema,
  libraryEntryDeleteResponseSchema,
  libraryEntryListResponseSchema,
  libraryEntryListSchema,
  libraryEntryPublicResponseSchema,
  libraryEntryQuerySchema,
  libraryEntryUpdateSchema,
  notFoundErrorSchema,
  unauthenticatedErrorSchema,
  validationErrorSchema,
} from "@library/contracts";
import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { AppError } from "../../errors/appError";
import { requireUser } from "../../middlewares/requireUser";
import { booksService } from "../books/booksService";
import { libraryService } from "./libraryService";

export const libraryRoutes: FastifyPluginAsync = async (app) => {
  app.withTypeProvider<ZodTypeProvider>().post("/library", {
    schema: {
      tags: ["LIBRARY"],
      summary: "Adiciona um livro à biblioteca",
      body: libraryEntryCreateSchema,
      response: {
        201: libraryEntryPublicResponseSchema,
        400: validationErrorSchema,
        401: unauthenticatedErrorSchema,
        409: conflictErrorSchema,
      },
    },
    preHandler: requireUser,
    handler: async (request, reply) => {
      if (!request.user) {
        throw new AppError("Não autenticado", 401, "UNAUTHENTICATED");
      }

      const entry = await booksService.addToLibrary(
        request.user.id,
        request.body,
      );
      const publicEntry = libraryEntryPublicResponseSchema.parse({
        id: entry.id,
        status: entry.status,
        currentPage: entry.currentPage,
        rating: entry.rating,
        review: entry.review,
        createdAt: entry.createdAt.toISOString(),
        updatedAt: entry.updatedAt.toISOString(),
        book: {
          googleBooksId: entry.book.googleBooksId,
          title: entry.book.title,
          authors: entry.book.authors,
          description: entry.book.description,
          coverUrl: entry.book.coverUrl,
          language: entry.book.language,
          pageCount: entry.book.pageCount,
        },
      });

      return reply.status(201).send(publicEntry);
    },
  });

  app.withTypeProvider<ZodTypeProvider>().get("/library", {
    schema: {
      tags: ["Library"],
      summary:
        "Retorna todas as saídas de de library de um usuário - Paginando e Filtrado",
      querystring: libraryEntryListSchema,
      response: {
        200: libraryEntryListResponseSchema,
        400: validationErrorSchema,
        401: unauthenticatedErrorSchema,
        409: conflictErrorSchema,
      },
    },
    preHandler: requireUser,
    handler: async (request, reply) => {
      const user = request.user;
      if (!user) {
        throw new AppError("Não autenticado", 401, "UNAUTHENTICATED");
      }
      const userId = user.id;

      const { page, pageSize, status } = libraryEntryListSchema.parse(
        request.query,
      );

      const result = await libraryService.listLibrarys({
        userId,
        page,
        pageSize,
        status,
      });
      const publicResult = libraryEntryListResponseSchema.parse({
        items: result.map((entry) => ({
          id: entry.id,
          status: entry.status,
          currentPage: entry.currentPage,
          rating: entry.rating,
          review: entry.review,
          createdAt: entry.createdAt.toISOString(),
          updatedAt: entry.updatedAt.toISOString(),
          book: {
            googleBooksId: entry.book.googleBooksId,
            title: entry.book.title,
            authors: entry.book.authors,
            description: entry.book.description,
            coverUrl: entry.book.coverUrl,
            language: entry.book.language,
            pageCount: entry.book.pageCount,
          },
        })),
        page,
        pageSize,
      });

      return reply.status(200).send(publicResult);
    },
  });

  app.withTypeProvider<ZodTypeProvider>().patch("/library/:libraryId", {
    schema: {
      tags: ["Library"],
      summary: "Atualiza uma leitura",
      body: libraryEntryUpdateSchema,
      params: libraryEntryQuerySchema,
      response: {
        200: libraryEntryPublicResponseSchema,
        400: validationErrorSchema,
        401: unauthenticatedErrorSchema,
        404: notFoundErrorSchema,
        409: conflictErrorSchema,
      },
    },
    preHandler: requireUser,
    handler: async (request, reply) => {
      const user = request.user;

      if (!user) {
        throw new AppError("Não autenticado", 401, "UNAUTHENTICATED");
      }
      const { libraryId } = libraryEntryQuerySchema.parse(request.params);
      const body = libraryEntryUpdateSchema.parse(request.body);

      const updatedLibrary = await libraryService.updateLibrary({
        userId: user.id,
        libraryId: libraryId,
        patch: body,
      });

      const publicUpdatedLibrary = libraryEntryPublicResponseSchema.parse({
        id: updatedLibrary.id,
        status: updatedLibrary.status,
        currentPage: updatedLibrary.currentPage,
        rating: updatedLibrary.rating,
        review: updatedLibrary.review,
        createdAt: updatedLibrary.createdAt.toISOString(),
        updatedAt: updatedLibrary.updatedAt.toISOString(),
        book: {
          googleBooksId: updatedLibrary.book.googleBooksId,
          title: updatedLibrary.book.title,
          authors: updatedLibrary.book.authors,
          description: updatedLibrary.book.description,
          coverUrl: updatedLibrary.book.coverUrl,
          language: updatedLibrary.book.language,
          pageCount: updatedLibrary.book.pageCount,
        },
      });

      return reply.status(200).send(publicUpdatedLibrary);
    },
  });

  app.withTypeProvider<ZodTypeProvider>().delete("/library/:libraryId", {
    schema: {
      tags: ["Library"],
      summary: "Deleta uma Library",
      params: libraryEntryQuerySchema,
      response: {
        204: libraryEntryDeleteResponseSchema,
        400: validationErrorSchema,
        401: unauthenticatedErrorSchema,
        409: conflictErrorSchema,
        404: notFoundErrorSchema,
      },
    },
    preHandler: requireUser,
    handler: async (request, reply) => {
      const user = request.user;
      if (!user) {
        throw new AppError("Não autenticado", 401, "UNAUTHENTICATED");
      }

      const { libraryId } = libraryEntryQuerySchema.parse(request.params);

      await libraryService.deleteLibrary({ userId: user.id, libraryId });
      reply.status(204);
    },
  });
};
