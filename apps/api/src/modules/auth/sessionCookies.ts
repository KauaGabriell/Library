import type { FastifyReply } from "fastify";
import { envConfig } from "../../config/env";

export function setSessionCookie(
  reply: FastifyReply,
  token: string,
  expiresAt: Date,
) {
  return reply.setCookie("session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: envConfig.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie(reply: FastifyReply) {
  return reply.clearCookie("session", {
    httpOnly: true,
    sameSite: "lax",
    secure: envConfig.NODE_ENV === "production",
    path: "/",
  });
}
