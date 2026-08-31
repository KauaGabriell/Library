import { createHash, randomBytes } from "node:crypto";

export function createSessionToken() {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
  return { token, tokenHash, expiresAt };
}
