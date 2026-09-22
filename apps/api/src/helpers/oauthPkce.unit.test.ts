import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { hashOAuthState, oauthPkce } from "./oauthPkce";

describe("oauthPkce", () => {
  it("creates base64url state and code verifier values", () => {
    const { state, codeVerifier } = oauthPkce();

    expect(state).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(codeVerifier).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(state).toHaveLength(43);
    expect(codeVerifier).toHaveLength(43);
  });

  it("derives the code challenge from the code verifier with SHA-256", () => {
    const { codeChallenge, codeVerifier } = oauthPkce();
    const expectedCodeChallenge = createHash("sha256")
      .update(codeVerifier)
      .digest("base64url");

    expect(codeChallenge).toBe(expectedCodeChallenge);
  });
});

describe("hashOAuthState", () => {
  it("returns a deterministic hash instead of the original state", () => {
    const state = "oauth-state";

    expect(hashOAuthState(state)).toBe(hashOAuthState(state));
    expect(hashOAuthState(state)).not.toBe(state);
  });

  it("returns a different hash for a different state", () => {
    expect(hashOAuthState("first-state")).not.toBe(
      hashOAuthState("second-state"),
    );
  });
});
