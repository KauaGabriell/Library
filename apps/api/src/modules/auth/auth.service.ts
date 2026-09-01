import {
  publicUserSchema,
  type RegisterRequestInput,
} from "@library/contracts";
import * as argon2 from "argon2";
import { AppError } from "../../errors/AppError";
import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { authRepository } from "./auth.repository";
import { createSessionToken } from "./sessionToken";

export const authService = {
  async createUser(input: RegisterRequestInput) {
    const passwordHash = await argon2.hash(input.password);
    const { token, tokenHash, expiresAt } = createSessionToken();

    try {
      const result = await prisma.$transaction(async (tx) => {
        const emailFormatted = input.email.trim().toLocaleLowerCase();
        const userExists = await authRepository.findByEmail(tx, emailFormatted);

        if (userExists)
          throw new AppError("Usuário já cadastrado", 409, "CONFLICT");

        const user = await authRepository.createUser(tx, {
          ...(input.name !== undefined ? { name: input.name } : {}),
          email: emailFormatted,
          passwordHash: passwordHash,
        });

        await authRepository.createSession(tx, {
          userId: user.id,
          tokenHash,
          expiresAt,
        });

        const publicUser = {
          token,
          user: publicUserSchema.parse({
            id: user.id,
            email: input.email,
            name: user.name,
            avatarUrl: user.avatarUrl,
          }),
        };
        return { publicUser, expiresAt };
      });
      return result;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new AppError("Usuário já cadastrado", 409, "CONFLICT");
      }
      throw error;
    }
  },
};
