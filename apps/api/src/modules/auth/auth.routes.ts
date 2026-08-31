import { registerRequestSchema } from "@library/contracts";
import type { FastifyPluginAsync } from "fastify";
import { authService } from "./auth.service";

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post("/users", async (request, reply) => {
    const input = registerRequestSchema.parse(request.body);

    const user = await authService.createUser(input);

    return reply.status(201).send(user);
  });
};
