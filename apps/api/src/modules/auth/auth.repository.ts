import type { PrismaClient } from "@prisma/client/extension";
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

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

export const authRepository = {
  async findByEmail(db: DatabaseClient, email: string) {
    return db.user.findUnique({
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

  async createSession(db: DatabaseClient, data: CreateSessionData) {
    return db.session.create({
      data: {
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
      },
    });
  },

  async findSession(db: DatabaseClient, tokenHash: string) {
    return db.session.findUnique({
      where: {
        tokenHash: tokenHash,
      },
    });
  },

  async revokeSession(db: DatabaseClient, tokenHash: string) {
    return db.session.updateMany({
      where: {
        tokenHash,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(Date.now()),
      },
    });
  },
};
