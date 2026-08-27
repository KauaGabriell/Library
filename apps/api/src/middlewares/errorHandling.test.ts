import { errorsSchema } from "@library/contracts";
import Fastify from "fastify";
import { afterAll, expect, test } from "vitest";
import { z } from "zod";
import { AppError } from "../errors/AppError";
import { registerErrorHandler } from "./errorHandling";

const testApp = Fastify({ logger: false });
const bodySchema = z.object({
  name: z.string(),
});

registerErrorHandler(testApp);

testApp.get("/unexpected-error", () => {
  throw new Error("detalhe secreto");
});

testApp.post("/invalid-payload", (req, _res) => {
  const body = bodySchema.parse(req.body);
  return body;
});

testApp.post("/conflict", () => {
  throw new AppError("Email já cadastrado", 409, "CONFLICT");
});

afterAll(async () => {
  await testApp.close();
});

test("retorna INTERNAL_ERROR sem vazar detalhes internos", async () => {
  const response = await testApp.inject({
    method: "GET",
    url: "/unexpected-error",
  });
  const body = response.json();

  expect(response.statusCode).toBe(500);
  expect(body).toEqual({
    code: "INTERNAL_ERROR",
    message: "Erro interno do servidor",
  });
  expect(errorsSchema.safeParse(body).success).toBe(true);
});

test("retorna VALIDATION_ERROR quando payload é inválido(ZOD ERROR)", async () => {
  const response = await testApp.inject({
    method: "POST",
    body: { name: 2 },
    url: "/invalid-payload",
  });
  const body = response.json();

  expect(response.statusCode).toBe(400);
  expect(body).toMatchObject({
    code: "VALIDATION_ERROR",
    message: "Dados inválidos",
    fieldErrors: {
      name: expect.any(Array),
    },
  });
  expect(body.fieldErrors?.name).toBeDefined();
  expect(body.fieldErrors?.name).toHaveLength(1);
  expect(errorsSchema.safeParse(body).success).toBe(true);
});

test("retorna CONFLICT para AppError conhecido(APP ERROR)", async () => {
  const response = await testApp.inject({
    method: "POST",
    body: { email: "teste@email.com" },
    url: "/conflict",
  });
  const body = response.json();
  expect(response.statusCode).toBe(409);
  expect(body).toMatchObject({
    message: "Email já cadastrado",
    code: "CONFLICT",
  });
  expect(errorsSchema.safeParse(body).success).toBe(true);
});
