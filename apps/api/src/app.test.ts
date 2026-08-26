import { afterAll, expect, test } from "vitest";
import { app } from "./app";

afterAll(async () => {
  await app.close();
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
