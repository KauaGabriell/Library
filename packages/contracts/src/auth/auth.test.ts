import { describe, expect, it } from "vitest";
import { registerRequestSchema } from "./register.js";

describe("registerRequestSchema", () => {
  it("rejects password shorter than 12 characters", () => {
    const result = registerRequestSchema.safeParse({
      name: null,
      email: "user@example.com",
      password: "12345678910",
    });
    expect(result.success).toBe(false);
  });

  it("accepts password with 12 chacaracters or more", () => {
    const result = registerRequestSchema.safeParse({
      name: "Kauã",
      email: "user@example.com",
      password: "123456789111",
    });
    expect(result.success).toBe(true);
  });
});
