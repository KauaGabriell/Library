import { loginRequestSchema, registerRequestSchema } from "@library/contracts";
import type { FastifyPluginAsync } from "fastify";
import { authService } from "./auth.service";
import { setSessionCookie } from "./sessionCookies";

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post("/register", async (request, reply) => {
    const input = registerRequestSchema.parse(request.body);

    const result = await authService.createUser(input);

    setSessionCookie(reply, result.publicUser.token, result.expiresAt);

    return reply.status(201).send(result.publicUser.user);
  });

  app.post("/login", async (request, reply) => {
    const input = loginRequestSchema.parse(request.body);

    const result = await authService.login(input);

    setSessionCookie(reply, result.publicUser.token, result.expiresAt);

    return reply.status(200).send(result.publicUser.user);
  });
};
