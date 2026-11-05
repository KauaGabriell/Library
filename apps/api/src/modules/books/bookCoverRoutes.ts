import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { AppError } from "../../errors/appError";
import { bookCoverStorage } from "./bookCoverStorage";

export const bookCoverRoutes: FastifyPluginAsync = async (app) => {
  app.withTypeProvider<ZodTypeProvider>().get("/:filename", {
    schema: {
      tags: ["Books"],
      summary: "Retorna uma capa enviada para a biblioteca",
      params: z.object({ filename: z.string().min(1) }),
    },
    handler: async (request, reply) => {
      const { filename } = request.params;
      const cover = await bookCoverStorage.open(filename);

      if (!cover) {
        throw new AppError("Capa não encontrada", 404, "NOT_FOUND");
      }

      return reply
        .header("Cache-Control", "private, max-age=31536000, immutable")
        .header("X-Content-Type-Options", "nosniff")
        .type(cover.contentType)
        .send(cover.stream);
    },
  });
};
