import {
  conflictErrorSchema,
  libraryEntryCreateSchema,
  libraryEntryListResponseSchema,
  libraryEntryListSchema,
  libraryEntryPublicResponseSchema,
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
};
