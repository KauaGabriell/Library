import { registerRequestSchema } from "@library/contracts";
import type { FastifyPluginAsync } from "fastify";
import { envConfig } from "../../config/env";
import { authService } from "./auth.service";

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post("/register", async (request, reply) => {
    const input = registerRequestSchema.parse(request.body);

    const result = await authService.createUser(input);

    reply.setCookie("session", result.publicUser.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: envConfig.NODE_ENV === "production",
      path: "/",
      expires: result.expiresAt,
    });

    return reply.status(201).send(result.publicUser.user);
  });
};
