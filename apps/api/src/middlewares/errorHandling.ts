import type { FastifyInstance } from "fastify";
import { ZodError, z } from "zod";
import { AppError } from "../errors/AppError";

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        code: error.code,
        message: error.message,
      });
    }

    if (error instanceof ZodError) {
      const { fieldErrors } = z.flattenError(error);

      return reply.status(400).send({
        code: "VALIDATION_ERROR",
        message: "Dados inválidos",
        fieldErrors,
      });
    }

    request.log.error({ err: error }, "Unhandled error");

    return reply.status(500).send({
      code: "INTERNAL_ERROR",
      message: "Erro interno do servidor",
    });
  });
}
