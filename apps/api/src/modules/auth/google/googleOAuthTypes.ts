export type GoogleProfile = {
  providerAccountId: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  avatarUrl: string | null;
};

export type GoogleTokens = {
  accessToken: string;
};

export interface GoogleOAuthAdapater {
  createAuthorizationUrl(input: { state: string; codeChallenge: string }): string;
  exchangeCode(input: {
    code: string;
    codeVerifier: string;
  }): Promise<GoogleTokens>;
  getProfile(acessToken: string): Promise<GoogleProfile>;
}
