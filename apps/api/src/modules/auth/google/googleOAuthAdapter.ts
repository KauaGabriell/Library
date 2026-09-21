import { z } from "zod";
import { envConfig } from "../../../config/env";
import { AppError } from "../../../errors/appError";
import type { GoogleTokens } from "./googleOAuthTypes";

const googleTokenResponseSchema = z.object({
  access_token: z.string().min(1),
});

const googleTokenEndpoint = "https://oauth2.googleapis.com/token";
const googleRequestTimeoutMs = 5_000;

function createGoogleIntegrationError() {
  return new AppError(
    "Não foi possível concluir a autenticação com Google",
    502,
    "INTEGRATION_ERROR",
  );
}

const { GOOGLE_CLIENT_ID, GOOGLE_REDIRECT_URI } = envConfig;
export function createAuthorizationUrl(state: string, codeChallenge: string) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", GOOGLE_CLIENT_ID);
  url.searchParams.set("redirect_uri", GOOGLE_REDIRECT_URI);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");

  return url.toString();
}

export async function exchangeCode(input: {
  code: string;
  codeVerifier: string;
}): Promise<GoogleTokens> {
  const body = new URLSearchParams({
    code: input.code,
    code_verifier: input.codeVerifier,
    client_id: envConfig.GOOGLE_CLIENT_ID,
    client_secret: envConfig.GOOGLE_CLIENT_SECRET,
    redirect_uri: envConfig.GOOGLE_REDIRECT_URI,
    grant_type: "authorization_code",
  });

  try {
    const result = await fetch(googleTokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(googleRequestTimeoutMs),
    });

    if (!result.ok) throw createGoogleIntegrationError();

    const data: unknown = await result.json();
    const tokenResult = googleTokenResponseSchema.safeParse(data);

    if (!tokenResult.success) throw createGoogleIntegrationError();

    return { accessToken: tokenResult.data.access_token };
  } catch (error) {
    if (error instanceof AppError) throw error;

    throw createGoogleIntegrationError();
  }
}
