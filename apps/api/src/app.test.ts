import { afterAll, expect, test } from "vitest";
import { app } from "./app";
import { envConfig } from "./config/env";

const { FRONTEND_URL } = envConfig;

afterAll(async () => {
  await app.close();
});

test("CORS Test", async () => {
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

test("Healthcheck retorna API OK", async () => {
  const response = await app.inject({
    method: "GET",
    url: "/health",
  });

  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual({ message: "API STATUS: OK" });
});

test("Database Health", async () => {
  const response = await app.inject({
    method: "GET",
    url: "/health/db",
  });
  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual({ database: "ok" });
});
