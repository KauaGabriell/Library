import {
  type GoogleCallbackQuery,
  type loginRequestInput,
  publicUserSchema,
  type RegisterRequestInput,
} from "@library/contracts";
import * as argon2 from "argon2";
import { envConfig } from "../../config/env";
import { AppError } from "../../errors/appError";
import { Prisma } from "../../generated/prisma/client";
import { hashOAuthState, oauthPkce } from "../../helpers/oauthPkce";
import { prisma } from "../../lib/prisma";
import { authRepository } from "./authRepository";
import {
  createAuthorizationUrl,
  exchangeCode,
  getProfile,
} from "./google/googleOAuthAdapter";
import type { GoogleProfile } from "./google/googleOAuthTypes";
import { createSessionToken, hashToken } from "./sessionToken";

function normalizeEmail(email: string) {
  return email.trim().toLocaleLowerCase();
}

async function consumeGoogleOAuthAuthorization(state: string) {
  const stateHash = hashOAuthState(state);
  const authorization = await authRepository.consumeOAuthAuthorization(prisma, {
    provider: "GOOGLE",
    now: new Date(Date.now()),
    stateHash: stateHash,
  });

  if (!authorization)
    throw new AppError(
      "Não foi possível autenticar com o Google",
      401,
      "UNAUTHENTICATED",
    );
  return authorization;
}

async function resolveGoogleUser(
  tx: Prisma.TransactionClient,
  profile: GoogleProfile,
) {
  const oAuthAccount = await authRepository.findOAuthAccountWithUser(tx, {
    provider: "GOOGLE",
    providerAccountId: profile.providerAccountId,
  });

  if (oAuthAccount) return oAuthAccount.user;
  const normalizedEmail = normalizeEmail(profile.email);

  const existingUser = await authRepository.findByEmail(tx, normalizedEmail);
  const user =
    existingUser ??
    (await authRepository.createUser(tx, {
      email: normalizedEmail,
      avatarUrl: profile.avatarUrl,
      name: profile.name,
    }));

  await authRepository.createOAuthAccount(tx, {
    provider: "GOOGLE",
    providerAccountId: profile.providerAccountId,
    userId: user.id,
  });
  return user;
}

export const authService = {
  async createUser(input: RegisterRequestInput) {
    const passwordHash = await argon2.hash(input.password);
    const { token, tokenHash, expiresAt } = createSessionToken();

    try {
      const result = await prisma.$transaction(async (tx) => {
        const emailFormatted = normalizeEmail(input.email);
        const userExists = await authRepository.findByEmail(
          prisma,
          emailFormatted,
        );

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

  async login(input: loginRequestInput) {
    const emailFormatted = normalizeEmail(input.email);
    const user = await authRepository.findByEmail(prisma, emailFormatted);

    if (!user?.passwordHash)
      throw new AppError("Credenciais inválidas", 401, "UNAUTHENTICATED");

    const passwordMatch = await argon2.verify(
      user.passwordHash,
      input.password,
    );
    if (!passwordMatch)
      throw new AppError("Credenciais inválidas", 401, "UNAUTHENTICATED");

    const { token, tokenHash, expiresAt } = createSessionToken();

    await authRepository.createSession(prisma, {
      userId: user.id,
      tokenHash: tokenHash,
      expiresAt: expiresAt,
    });

    const publicUser = {
      token: token,
      user: publicUserSchema.parse({
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
      }),
    };
    return { publicUser, expiresAt };
  },

  async logout(tokenSession: string) {
    const sessionTokenHashed = hashToken(tokenSession);
    const session = await authRepository.findSession(
      prisma,
      sessionTokenHashed,
    );

    if (session === null) return;

    await authRepository.revokeSession(prisma, session.tokenHash);
  },

  async startGoogleOAuth() {
    const { state, codeVerifier, codeChallenge } = oauthPkce();
    const stateHash = hashOAuthState(state);
    await authRepository.createOAuthAuthorization(prisma, {
      provider: "GOOGLE",
      stateHash: stateHash,
      codeVerifier,
      expiresAt: new Date(
        Date.now() + envConfig.OAUTH_AUTHORIZATION_TTL_SECONDS * 1000,
      ),
    });

    const url = createAuthorizationUrl(state, codeChallenge);
    return url;
  },

  async completeGoogleOAuth(input: GoogleCallbackQuery) {
    const authorization = await consumeGoogleOAuthAuthorization(input.state);

    const tokens = await exchangeCode({
      code: input.code,
      codeVerifier: authorization.codeVerifier,
    });

    const profile = await getProfile(tokens.accessToken);

    if (profile.emailVerified === false)
      throw new AppError(
        "Não foi possível autenticar com o Google",
        401,
        "UNAUTHENTICATED",
      );

    return await prisma.$transaction(async (tx) => {
      const user = await resolveGoogleUser(tx, profile);
      const { token, tokenHash, expiresAt } = createSessionToken();
      await authRepository.createSession(tx, {
        userId: user.id,
        tokenHash,
        expiresAt,
      });
      const publicUser = {
        token,
        user: publicUserSchema.parse({
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
        }),
      };
      return { token, publicUser, expiresAt };
    });
  },
};
