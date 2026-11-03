import { createHash } from "node:crypto";
import type { FastifyRequest } from "fastify";

function createRecommendationRateLimitKey(request: FastifyRequest): string {
  const sessionToken = request.cookies.session;

  if (!sessionToken) return `ip:${request.ip}`;

  const sessionHash = createHash("sha256").update(sessionToken).digest("hex");

  return `session:${sessionHash}`;
}

export const recommendationRateLimit = {
  max: 10,
  timeWindow: "24 hours",
  keyGenerator: createRecommendationRateLimitKey,
};
