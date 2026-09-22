import { createHash, randomBytes } from "node:crypto";
export function oauthPkce() {
  const state = randomBytes(32).toString("base64url");
  const codeVerifier = randomBytes(32).toString("base64url");
  const codeChallenge = createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");

  return { state, codeChallenge, codeVerifier };
}

export function hashOAuthState(state: string) {
  const stateHash = createHash("sha256").update(state).digest("base64url");
  return stateHash;
}
