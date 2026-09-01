import { afterAll, describe, expect, it } from "vitest";
import { app } from "./app";
import { envConfig } from "./config/env";

const { FRONTEND_URL } = envConfig;

afterAll(async () => {
  await app.close();
});

describe("application", () => {
  it("returns CORS headers for an allowed origin", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health",
      headers: {
        origin: FRONTEND_URL,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe(FRONTEND_URL);
    expect(response.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("returns API status from the health check", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ message: "API STATUS: OK" });
  });

  it("returns database status from the health check", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health/db",
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ database: "ok" });
  });

  function createUser(name: string, age: number) {
    return { name, age };
  }

  it("creates a user payload", () => {
    const user = createUser("João", 12);

    if (!user) throw new Error();
  });
});
