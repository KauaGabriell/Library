import { afterEach, describe, expect, it, vi } from "vitest";
import { envConfig } from "../../../config/env";
import {
  createAuthorizationUrl,
  exchangeCode,
  getProfile,
} from "./googleOAuthAdapter";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Google OAuth adapter", () => {
  it("creates an authorization URL with PKCE parameters", () => {
    const state = "state-example";
    const codeChallenge = "code-challenge-example";

    const url = new URL(createAuthorizationUrl(state, codeChallenge));

    expect(url.origin).toBe("https://accounts.google.com");
    expect(url.pathname).toBe("/o/oauth2/v2/auth");
    expect(url.searchParams.get("client_id")).toBe(envConfig.GOOGLE_CLIENT_ID);
    expect(url.searchParams.get("redirect_uri")).toBe(
      envConfig.GOOGLE_REDIRECT_URI,
    );
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("scope")).toBe("openid email profile");
    expect(url.searchParams.get("state")).toBe(state);
    expect(url.searchParams.get("code_challenge")).toBe(codeChallenge);
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
  });

  it("returns an access token when Google accepts the authorization code", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ access_token: "google-access-token" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      exchangeCode({
        code: "authorization-code",
        codeVerifier: "code-verifier",
      }),
    ).resolves.toEqual({ accessToken: "google-access-token" });

    const [, requestOptions] = fetchMock.mock.calls[0] as [
      string,
      RequestInit,
    ];
    const requestBody = requestOptions.body as URLSearchParams;

    expect(requestBody.get("code")).toBe("authorization-code");
    expect(requestBody.get("code_verifier")).toBe("code-verifier");
    expect(requestBody.get("client_id")).toBe(envConfig.GOOGLE_CLIENT_ID);
    expect(requestBody.get("client_secret")).toBe(
      envConfig.GOOGLE_CLIENT_SECRET,
    );
    expect(requestBody.get("redirect_uri")).toBe(
      envConfig.GOOGLE_REDIRECT_URI,
    );
    expect(requestBody.get("grant_type")).toBe("authorization_code");
  });

  it("throws an integration error when Google rejects the authorization code", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 400 })));

    await expect(
      exchangeCode({ code: "invalid-code", codeVerifier: "code-verifier" }),
    ).rejects.toMatchObject({
      statusCode: 502,
      code: "INTEGRATION_ERROR",
    });
  });

  it("throws an integration error when Google omits the access token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({}), { status: 200 })),
    );

    await expect(
      exchangeCode({ code: "authorization-code", codeVerifier: "code-verifier" }),
    ).rejects.toMatchObject({
      statusCode: 502,
      code: "INTEGRATION_ERROR",
    });
  });

  it("throws an integration error when the Google request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network failure")));

    await expect(
      exchangeCode({ code: "authorization-code", codeVerifier: "code-verifier" }),
    ).rejects.toMatchObject({
      statusCode: 502,
      code: "INTEGRATION_ERROR",
    });
  });

  it("maps a Google profile to the internal profile contract", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          sub: "google-user-id",
          email: "user@example.com",
          email_verified: true,
          name: "Google User",
          picture: "https://example.com/avatar.png",
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getProfile("google-access-token")).resolves.toEqual({
      providerAccountId: "google-user-id",
      email: "user@example.com",
      emailVerified: true,
      name: "Google User",
      avatarUrl: "https://example.com/avatar.png",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://openidconnect.googleapis.com/v1/userinfo",
      expect.objectContaining({
        method: "GET",
        headers: { Authorization: "Bearer google-access-token" },
      }),
    );
  });

  it("maps an omitted Google name and picture to null", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            sub: "google-user-id",
            email: "user@example.com",
            email_verified: true,
          }),
          { status: 200 },
        ),
      ),
    );

    await expect(getProfile("google-access-token")).resolves.toEqual({
      providerAccountId: "google-user-id",
      email: "user@example.com",
      emailVerified: true,
      name: null,
      avatarUrl: null,
    });
  });

  it("throws an integration error when Google rejects the profile request", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 401 })));

    await expect(getProfile("invalid-access-token")).rejects.toMatchObject({
      statusCode: 502,
      code: "INTEGRATION_ERROR",
    });
  });

  it("throws an integration error when Google returns an invalid profile", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ email: "user@example.com" }), {
          status: 200,
        }),
      ),
    );

    await expect(getProfile("google-access-token")).rejects.toMatchObject({
      statusCode: 502,
      code: "INTEGRATION_ERROR",
    });
  });

  it("throws an integration error when the Google profile request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network failure")),
    );

    await expect(getProfile("google-access-token")).rejects.toMatchObject({
      statusCode: 502,
      code: "INTEGRATION_ERROR",
    });
  });
});
