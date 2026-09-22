import type { PrismaClient } from "@prisma/client/extension";
import type { OAuthProvider, Prisma } from "../../generated/prisma/client";

type CreateSessionData = {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
};

type CreateUserData = {
  name?: string | null;
  email: string;
  passwordHash?: string | null;
  avatarUrl?: string | null;
};

type CreateOAuthAccountData = {
  provider: OAuthProvider;
  providerAccountId: string;
  userId: string;
};

type GoogleAuthorizationData = {
  provider: OAuthProvider;
  stateHash: string;
  codeVerifier: string;
  expiresAt: Date;
};

type ConsumeOAuthAuthorizationData = {
  provider: OAuthProvider;
  stateHash: string;
  now: Date;
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

  async findOAuthAccountWithUser(
    db: DatabaseClient,
    data: { provider: OAuthProvider; providerAccountId: string },
  ) {
    return db.oAuthAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider: data.provider,
          providerAccountId: data.providerAccountId,
        },
      },
      select: { user: true },
    });
  },

  async createOAuthAccount(
    tx: Prisma.TransactionClient,
    data: CreateOAuthAccountData,
  ) {
    return tx.oAuthAccount.create({
      data: {
        provider: data.provider,
        providerAccountId: data.providerAccountId,
        userId: data.userId,
      },
    });
  },

  async createUser(tx: Prisma.TransactionClient, data: CreateUserData) {
    return tx.user.create({
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        email: data.email,
        passwordHash: data.passwordHash ?? null,
        avatarUrl: data.avatarUrl ?? null,
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

  async createOAuthAuthorization(
    db: DatabaseClient,
    data: GoogleAuthorizationData,
  ) {
    return db.oAuthAuthorization.create({
      data: {
        provider: data.provider,
        stateHash: data.stateHash,
        codeVerifier: data.codeVerifier,
        expiresAt: data.expiresAt,
      },
    });
  },

  async consumeOAuthAuthorization(
    db: DatabaseClient,
    data: ConsumeOAuthAuthorizationData,
  ) {
    const result = await db.oAuthAuthorization.updateManyAndReturn({
      where: {
        provider: data.provider,
        stateHash: data.stateHash,
        consumedAt: null,
        expiresAt: {
          gt: data.now,
        },
      },
      data: {
        consumedAt: data.now,
      },
    });

    return result[0] ?? null;
  },
};
