import { expect, test } from "vitest";
import { app } from "./app";

test("Healthcheck retorna API OK", async () => {
  const response = await app.inject({
    method: "GET",
    url: "/health",
  });

  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual({ message: "API STATUS: OK" });
});
