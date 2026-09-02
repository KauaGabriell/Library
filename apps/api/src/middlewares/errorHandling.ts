import type { FastifyInstance } from "fastify";
import { hasZodFastifySchemaValidationErrors } from "fastify-type-provider-zod";
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

    if (hasZodFastifySchemaValidationErrors(error)) {
      const fieldErrors = error.validation.reduce<Record<string, string[]>>(
        (accumulator, issue) => {
          const field = issue.instancePath.replace(/^\//, "") || "form";
          const message = issue.message ?? "Valor inválido";

          const messages = accumulator[field] ?? [];
          messages.push(message);

          accumulator[field] = messages;

          return accumulator;
        },
        {},
      );
      return reply.status(400).send({
        code: "VALIDATION_ERROR",
        message: "Dados inválidos",
        fieldErrors: fieldErrors,
      });
    }

    request.log.error({ err: error }, "Unhandled error");

    return reply.status(500).send({
      code: "INTERNAL_ERROR",
      message: "Erro interno do servidor",
    });
  });
}
