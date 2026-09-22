import { describe, expect, it } from "vitest";
import { googleCallbackQuerySchema } from "../googleCallback.js";

describe("googleCallbackQuerySchema", () => {
  it("accepts a callback query with code and state", () => {
    const result = googleCallbackQuerySchema.safeParse({
      code: "google-authorization-code",
      state: "oauth-state",
    });

    expect(result.success).toBe(true);
  });

  it("rejects a callback query without code", () => {
    const result = googleCallbackQuerySchema.safeParse({
      state: "oauth-state",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a callback query without state", () => {
    const result = googleCallbackQuerySchema.safeParse({
      code: "google-authorization-code",
    });

    expect(result.success).toBe(false);
  });

  it("rejects empty code and state", () => {
    const result = googleCallbackQuerySchema.safeParse({
      code: "",
      state: "",
    });

    expect(result.success).toBe(false);
  });
});
