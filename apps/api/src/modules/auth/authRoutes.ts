import {
  conflictErrorSchema,
  googleCallbackQuerySchema,
  loginRequestSchema,
  publicUserSchema,
  registerRequestSchema,
  unauthenticatedErrorSchema,
  validationErrorSchema,
} from "@library/contracts";
import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";
import { envConfig } from "../../config/env";
import { AppError } from "../../errors/appError";
import { requireUser } from "../../middlewares/requireUser";
import { authService } from "./authService";
import { clearSessionCookie, setSessionCookie } from "./sessionCookies";

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

  app.withTypeProvider<ZodTypeProvider>().get("/me", {
    schema: {
      tags: ["Auth"],
      summary: "Retorna o usuário autenticado local",
      response: {
        200: publicUserSchema,
        401: unauthenticatedErrorSchema,
      },
    },
    preHandler: requireUser,
    handler: async (request, reply) => {
      const result = request.user;

      if (!result)
        throw new AppError("Não autenticado", 401, "UNAUTHENTICATED");

      reply.status(200).send(result);
    },
  });

  app.withTypeProvider<ZodTypeProvider>().post("/logout", {
    schema: {
      tags: ["Auth"],
      summary: "Realiza logout",
      response: {
        204: z.undefined(),
        401: unauthenticatedErrorSchema,
      },
    },
    handler: async (request, reply) => {
      const sessionToken = request.cookies.session;

      if (sessionToken) {
        await authService.logout(sessionToken);
      }

      clearSessionCookie(reply);
      reply.status(204).send();
    },
  });

  app.withTypeProvider<ZodTypeProvider>().get("/google", {
    schema: {
      tags: ["Auth"],
      summary: "Inicia autenticação do Google OAuth",
    },
    handler: async (_request, reply) => {
      const url = await authService.startGoogleOAuth();

      reply.redirect(url);
    },
  });
  app.withTypeProvider<ZodTypeProvider>().get("/google/callback", {
    schema: {
      tags: ["Auth"],
      summary: "Completa Autenticação do Google com OAuth",
      querystring: googleCallbackQuerySchema,
    },
    handler: async (request, reply) => {
      const { code, state } = googleCallbackQuerySchema.parse(request.query);

      const result = await authService.completeGoogleOAuth({ code, state });
      setSessionCookie(reply, result.token, result.expiresAt);

      return reply.redirect(`${envConfig.FRONTEND_OAUTH_CALLBACK_URL}`);
    },
  });
};
