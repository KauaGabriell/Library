import {
  conflictErrorSchema,
  loginRequestSchema,
  publicUserSchema,
  registerRequestSchema,
  unauthenticatedErrorSchema,
  validationErrorSchema,
} from "@library/contracts";
import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { authService } from "./auth.service";
import { setSessionCookie } from "./sessionCookies";

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.withTypeProvider<ZodTypeProvider>().post("/register", {
    schema: {
      tags: ["Auth"],
      summary: "Registra usuário local",
      body: registerRequestSchema,
      response: {
        201: publicUserSchema,
        400: validationErrorSchema,
        409: conflictErrorSchema,
      },
    },
    handler: async (request, reply) => {
      const input = request.body;

      const result = await authService.createUser(input);

      setSessionCookie(reply, result.publicUser.token, result.expiresAt);

      return reply.status(201).send(result.publicUser.user);
    },
  });

  app.withTypeProvider<ZodTypeProvider>().post("/login", {
    schema: {
      tags: ["Auth"],
      summary: "Autentica usuário local",
      body: loginRequestSchema,
      response: {
        200: publicUserSchema,
        400: validationErrorSchema,
        401: unauthenticatedErrorSchema,
      },
    },
    handler: async (request, reply) => {
      const input = request.body;
      const result = await authService.login(input);

      setSessionCookie(reply, result.publicUser.token, result.expiresAt);

      return reply.status(200).send(result.publicUser.user);
    },
  });
};
