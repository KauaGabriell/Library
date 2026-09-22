import { createHash } from "node:crypto";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { app } from "../../../app";
import { envConfig } from "../../../config/env";
import { hashOAuthState } from "../../../helpers/oauthPkce";
import { prisma } from "../../../lib/prisma";
import { hashToken } from "../sessionToken";

const googleOAuthAdapterMock = vi.hoisted(() => ({
  createAuthorizationUrl: vi.fn(),
  exchangeCode: vi.fn(),
  getProfile: vi.fn(),
}));

vi.mock("../google/googleOAuthAdapter", () => googleOAuthAdapterMock);

const googleAccessToken = "google-access-token";
const googleProfile = {
  providerAccountId: "google-route-user-id",
  email: "route-user@example.com",
  emailVerified: true,
  name: "Google Route User",
  avatarUrl: "https://example.com/avatar.png",
};

async function clearDatabase() {
  await prisma.oAuthAuthorization.deleteMany();
  await prisma.session.deleteMany();
  await prisma.oAuthAccount.deleteMany();
  await prisma.user.deleteMany();
}

function getRequiredLocation(location: string | undefined) {
  if (!location) throw new Error("Redirect não retornou Location");

  return location;
}

beforeEach(async () => {
  await clearDatabase();
  vi.clearAllMocks();
  googleOAuthAdapterMock.createAuthorizationUrl.mockImplementation(
    (state: string, codeChallenge: string) => {
      const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      url.searchParams.set("state", state);
      url.searchParams.set("code_challenge", codeChallenge);
      url.searchParams.set("code_challenge_method", "S256");
      return url.toString();
    },
  );
});

afterEach(clearDatabase);

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

describe("GET /auth/google", () => {
  it("redirects with a persisted state and PKCE challenge", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/auth/google",
    });
    const authorizationUrl = new URL(
      getRequiredLocation(response.headers.location),
    );
    const state = authorizationUrl.searchParams.get("state");

    if (!state) throw new Error("State OAuth não retornado");

    const authorization = await prisma.oAuthAuthorization.findUnique({
      where: { stateHash: hashOAuthState(state) },
    });

    expect(response.statusCode).toBe(302);
    expect(authorizationUrl.searchParams.get("code_challenge_method")).toBe(
      "S256",
    );
    expect(authorizationUrl.searchParams.get("code_challenge")).toBeTruthy();
    expect(authorization?.stateHash).toBe(hashOAuthState(state));
    expect(authorization?.stateHash).not.toBe(state);
    expect(authorization?.expiresAt.getTime()).toBeGreaterThan(Date.now());

    const expectedChallenge = createHash("sha256")
      .update(authorization?.codeVerifier ?? "")
      .digest("base64url");
    expect(authorizationUrl.searchParams.get("code_challenge")).toBe(
      expectedChallenge,
    );
  });
});

describe("GET /auth/google/callback", () => {
  it("creates a local session, sets an HttpOnly cookie and redirects to the frontend", async () => {
    const startResponse = await app.inject({
      method: "GET",
      url: "/auth/google",
    });
    const authorizationUrl = new URL(
      getRequiredLocation(startResponse.headers.location),
    );
    const state = authorizationUrl.searchParams.get("state");

    if (!state) throw new Error("State OAuth não retornado");

    googleOAuthAdapterMock.exchangeCode.mockResolvedValue({
      accessToken: googleAccessToken,
    });
    googleOAuthAdapterMock.getProfile.mockResolvedValue(googleProfile);

    const response = await app.inject({
      method: "GET",
      url: `/auth/google/callback?code=google-authorization-code&state=${state}`,
    });
    const sessionToken = response.cookies.find(
      (cookie) => cookie.name === "session",
    )?.value;

    if (!sessionToken) throw new Error("Cookie de sessão não retornado");

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
      where: { tokenHash: hashToken(sessionToken) },
    });
    const setCookieHeader = Array.isArray(response.headers["set-cookie"])
      ? response.headers["set-cookie"].join("; ")
      : (response.headers["set-cookie"] ?? "");

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe(envConfig.FRONTEND_OAUTH_CALLBACK_URL);
    expect(setCookieHeader).toContain("HttpOnly");
    expect(response.body).not.toContain(googleAccessToken);
    expect(response.headers.location).not.toContain(googleAccessToken);
    expect(sessionToken).not.toBe(googleAccessToken);
    expect(session?.tokenHash).toBe(hashToken(sessionToken));
    expect(session?.tokenHash).not.toBe(hashToken(googleAccessToken));
    expect(session?.userId).toBe(user?.id);
    expect(oauthAccount?.userId).toBe(user?.id);
  });
});
