import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../../../errors/appError";
import { hashOAuthState } from "../../../helpers/oauthPkce";
import { prisma } from "../../../lib/prisma";
import { hashToken } from "../sessionToken";

const googleOAuthAdapterMock = vi.hoisted(() => ({
  createAuthorizationUrl: vi.fn(),
  exchangeCode: vi.fn(),
  getProfile: vi.fn(),
}));

vi.mock("../google/googleOAuthAdapter", () => googleOAuthAdapterMock);

import { authService } from "../authService";

const googleProfile = {
  providerAccountId: "google-user-id",
  email: "user@example.com",
  emailVerified: true,
  name: "Google User",
  avatarUrl: "https://example.com/avatar.png",
};

async function clearDatabase() {
  await prisma.oAuthAuthorization.deleteMany();
  await prisma.session.deleteMany();
  await prisma.oAuthAccount.deleteMany();
  await prisma.user.deleteMany();
}

async function createOAuthAuthorization(input: {
  state: string;
  codeVerifier: string;
  expiresAt?: Date;
}) {
  return prisma.oAuthAuthorization.create({
    data: {
      provider: "GOOGLE",
      stateHash: hashOAuthState(input.state),
      codeVerifier: input.codeVerifier,
      expiresAt: input.expiresAt ?? new Date("2030-01-01T00:00:00.000Z"),
    },
  });
}

async function expectNoIdentityData() {
  await expect(prisma.user.count()).resolves.toBe(0);
  await expect(prisma.oAuthAccount.count()).resolves.toBe(0);
  await expect(prisma.session.count()).resolves.toBe(0);
}

function mockSuccessfulGoogleProfile(profile = googleProfile) {
  googleOAuthAdapterMock.exchangeCode.mockResolvedValue({
    accessToken: "google-access-token",
  });
  googleOAuthAdapterMock.getProfile.mockResolvedValue(profile);
}

beforeEach(async () => {
  await clearDatabase();
  vi.clearAllMocks();
});

afterEach(clearDatabase);

afterAll(async () => {
  await prisma.$disconnect();
});

describe("authService.completeGoogleOAuth", () => {
  it("creates an identity and a local session for a valid callback", async () => {
    const state = "valid-google-oauth-state";
    const codeVerifier = "valid-google-oauth-code-verifier";
    const authorization = await createOAuthAuthorization({ state, codeVerifier });
    mockSuccessfulGoogleProfile();

    const result = await authService.completeGoogleOAuth({
      code: "google-authorization-code",
      state,
    });

    expect(result).toEqual({
      token: expect.any(String),
      publicUser: {
        token: expect.any(String),
        user: {
          id: expect.any(String),
          email: googleProfile.email,
          name: googleProfile.name,
          avatarUrl: googleProfile.avatarUrl,
        },
      },
      expiresAt: expect.any(Date),
    });
    expect(result.publicUser.token).toBe(result.token);
    expect(result.token).not.toBe("google-access-token");
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());

    expect(googleOAuthAdapterMock.exchangeCode).toHaveBeenCalledWith({
      code: "google-authorization-code",
      codeVerifier,
    });
    expect(googleOAuthAdapterMock.getProfile).toHaveBeenCalledWith(
      "google-access-token",
    );

    const user = await prisma.user.findUnique({
      where: { email: googleProfile.email },
    });
    const oauthAccount = await prisma.oAuthAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider: "GOOGLE",
          providerAccountId: googleProfile.providerAccountId,
        },
      },
    });
    const session = await prisma.session.findUnique({
      where: { tokenHash: hashToken(result.token) },
    });
    const persistedAuthorization = await prisma.oAuthAuthorization.findUnique({
      where: { id: authorization.id },
    });

    expect(user?.id).toBe(result.publicUser.user.id);
    expect(user?.passwordHash).toBeNull();
    expect(oauthAccount?.userId).toBe(user?.id);
    expect(session?.userId).toBe(user?.id);
    expect(session?.tokenHash).not.toBe(result.token);
    expect(session?.tokenHash).not.toBe(hashToken("google-access-token"));
    expect(persistedAuthorization?.consumedAt).toBeInstanceOf(Date);
  });

  it("links Google to an existing local user with the same normalized email", async () => {
    const existingUser = await prisma.user.create({
      data: {
        email: "existing@example.com",
        passwordHash: "local-password-hash",
      },
    });
    const state = "link-existing-user-state";
    await createOAuthAuthorization({
      state,
      codeVerifier: "link-existing-user-verifier",
    });
    mockSuccessfulGoogleProfile({
      ...googleProfile,
      email: "Existing@Example.com",
      providerAccountId: "google-existing-user-id",
    });

    const result = await authService.completeGoogleOAuth({
      code: "google-authorization-code",
      state,
    });

    const oauthAccount = await prisma.oAuthAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider: "GOOGLE",
          providerAccountId: "google-existing-user-id",
        },
      },
    });

    expect(result.publicUser.user.id).toBe(existingUser.id);
    await expect(prisma.user.count()).resolves.toBe(1);
    expect(oauthAccount?.userId).toBe(existingUser.id);
    await expect(
      prisma.session.count({ where: { userId: existingUser.id } }),
    ).resolves.toBe(1);
  });

  it("rejects an unknown state before calling Google or creating identity data", async () => {
    await expect(
      authService.completeGoogleOAuth({
        code: "google-authorization-code",
        state: "unknown-google-oauth-state",
      }),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: "UNAUTHENTICATED",
    });

    expect(googleOAuthAdapterMock.exchangeCode).not.toHaveBeenCalled();
    expect(googleOAuthAdapterMock.getProfile).not.toHaveBeenCalled();
    await expectNoIdentityData();
  });

  it("rejects an expired state before calling Google or creating identity data", async () => {
    await createOAuthAuthorization({
      state: "expired-google-oauth-state",
      codeVerifier: "expired-google-oauth-code-verifier",
      expiresAt: new Date("2020-01-01T00:00:00.000Z"),
    });

    await expect(
      authService.completeGoogleOAuth({
        code: "google-authorization-code",
        state: "expired-google-oauth-state",
      }),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: "UNAUTHENTICATED",
    });

    expect(googleOAuthAdapterMock.exchangeCode).not.toHaveBeenCalled();
    await expectNoIdentityData();
  });

  it("rejects a reused state without creating another identity or session", async () => {
    const state = "reused-google-oauth-state";
    await createOAuthAuthorization({
      state,
      codeVerifier: "reused-google-oauth-code-verifier",
    });
    mockSuccessfulGoogleProfile();

    await authService.completeGoogleOAuth({
      code: "google-authorization-code",
      state,
    });

    await expect(
      authService.completeGoogleOAuth({
        code: "another-google-authorization-code",
        state,
      }),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: "UNAUTHENTICATED",
    });

    expect(googleOAuthAdapterMock.exchangeCode).toHaveBeenCalledTimes(1);
    await expect(prisma.user.count()).resolves.toBe(1);
    await expect(prisma.oAuthAccount.count()).resolves.toBe(1);
    await expect(prisma.session.count()).resolves.toBe(1);
  });

  it("rejects an unverified Google email without creating identity data", async () => {
    const state = "unverified-google-oauth-state";
    await createOAuthAuthorization({
      state,
      codeVerifier: "unverified-google-oauth-code-verifier",
    });
    mockSuccessfulGoogleProfile({
      ...googleProfile,
      emailVerified: false,
    });

    await expect(
      authService.completeGoogleOAuth({
        code: "google-authorization-code",
        state,
      }),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: "UNAUTHENTICATED",
    });

    await expectNoIdentityData();
  });

  it("preserves a Google integration error without creating identity data", async () => {
    const state = "provider-failure-google-oauth-state";
    await createOAuthAuthorization({
      state,
      codeVerifier: "provider-failure-google-oauth-code-verifier",
    });
    googleOAuthAdapterMock.exchangeCode.mockRejectedValue(
      new AppError(
        "Não foi possível concluir a autenticação com Google",
        502,
        "INTEGRATION_ERROR",
      ),
    );

    await expect(
      authService.completeGoogleOAuth({
        code: "google-authorization-code",
        state,
      }),
    ).rejects.toMatchObject({
      statusCode: 502,
      code: "INTEGRATION_ERROR",
    });

    expect(googleOAuthAdapterMock.getProfile).not.toHaveBeenCalled();
    await expectNoIdentityData();
  });
});
