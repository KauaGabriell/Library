import { createHash } from "node:crypto";
import { publicUserSchema } from "@library/contracts";
import type { FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "../errors/AppError";
import { prisma } from "../lib/prisma";

export async function requireUser(
  request: FastifyRequest,
  _reply: FastifyReply,
) {
  const sessionToken = request.cookies.session;

  if (!sessionToken)
    throw new AppError("Não autenticado", 401, "UNAUTHENTICATED");

  const sessionTokenHashed = createHash("sha256")
    .update(sessionToken)
    .digest("hex");

  const now = new Date();
  const session = await prisma.session.findFirst({
    where: {
      tokenHash: sessionTokenHashed,
      revokedAt: null,
      expiresAt: {
        gt: now,
      },
    },
  });
  if (!session) throw new AppError("Não autenticado", 401, "UNAUTHENTICATED");

  const user = await prisma.user.findUnique({
    where: {
      id: session.userId,
    },
  });

  if (!user) throw new AppError("Não autenticado", 401, "UNAUTHENTICATED");

  request.user = publicUserSchema.parse({
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
  });
}
