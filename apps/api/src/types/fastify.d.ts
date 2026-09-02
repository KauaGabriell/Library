import type { PublicUser } from "@library/contracts";

declare module "fastify" {
  interface FastifyRequest {
    user: PublicUser | null;
  }
}
