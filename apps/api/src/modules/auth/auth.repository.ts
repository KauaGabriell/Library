import type { Prisma } from "../../generated/prisma/client";

type CreateSessionData = {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
};

type CreateUserData = {
  name?: string;
  email: string;
  passwordHash: string;
};

export const authRepository = {
  async findByEmail(tx: Prisma.TransactionClient, email: string) {
    return tx.user.findUnique({
      where: {
        email: email,
      },
    });
  },

  async createUser(tx: Prisma.TransactionClient, data: CreateUserData) {
    return tx.user.create({
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        email: data.email,
        passwordHash: data.passwordHash,
      },
    });
  },

  async createSession(tx: Prisma.TransactionClient, data: CreateSessionData) {
    return tx.session.create({
      data: {
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
      },
    });
  },
};
