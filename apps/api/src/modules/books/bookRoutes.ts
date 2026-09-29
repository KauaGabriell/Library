import { bookSearchResponseSchema, bookSearchSchema } from "@library/contracts";
import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { booksService } from "./booksService";

export const bookRoutes: FastifyPluginAsync = async (app) => {
  app.withTypeProvider<ZodTypeProvider>().get("/search", {
    schema: {
      tags: ["BOOKS"],
      summary: "Busca um livro",
      response: {
        200: bookSearchResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { q, page, pageSize } = bookSearchSchema.parse(request.query);
      const result = await booksService.searchBook({ q, page, pageSize });

      reply.status(200).send(result);
    },
  });
};
