import { createHash } from "node:crypto";
import * as argon2 from "argon2";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { app } from "../../../app";
import { prisma } from "../../../lib/prisma";

async function clearDatabase() {
  await prisma.session.deleteMany();
  await prisma.oAuthAccount.deleteMany();
  await prisma.user.deleteMany();
}

beforeEach(clearDatabase);
afterEach(clearDatabase);

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
});

describe("POST /auth/register", () => {
  const password = "security-password-with-12-characters";

  it("returns 201 and a secure cookie for valid registration", async () => {
    const response = await app.inject({
      method: "POST",
      path: "/auth/register",
      payload: {
        name: "user",
        email: "user@example.com",
        password,
      },
    });

    const setCookieHeader = response.headers["set-cookie"];
    const setCookie = Array.isArray(setCookieHeader)
      ? setCookieHeader.join("; ")
      : (setCookieHeader ?? "");

    const publicUser = response.json();

    expect(response.statusCode).toBe(201);
    expect(publicUser).toEqual({
      id: expect.any(String),
      name: "user",
      email: "user@example.com",
      avatarUrl: null,
    });
    expect(publicUser).not.toHaveProperty("password");
    expect(publicUser).not.toHaveProperty("passwordHash");
    expect(publicUser).not.toHaveProperty("token");

    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Lax");

    const token = setCookie.match(/session=([^;]+)/)?.[1];

    if (!token) {
      throw new Error("Cookie de sessão não foi retornado");
    }

    const user = await prisma.user.findUnique({
      where: { id: publicUser.id },
      select: { passwordHash: true },
    });

    if (!user?.passwordHash) {
      throw new Error("Usuário ou hash de senha não foi encontrado");
    }
    expect(user?.passwordHash).not.toBe(password);
    expect(await argon2.verify(user.passwordHash, password)).toBe(true);

    const session = await prisma.session.findFirst({
      where: { userId: publicUser.id },
      select: { tokenHash: true },
    });

    if (!session?.tokenHash) {
      throw new Error("Sessão não foi encontrada");
    }

    expect(session.tokenHash).not.toBe(token);
    expect(session?.tokenHash).toBe(
      createHash("sha256").update(token).digest("hex"),
    );
  });

  it("returns 400 for an invalid password", async () => {
    const response = await app.inject({
      method: "POST",
      path: "/auth/register",
      payload: {
        name: "user",
        email: "user@example.com",
        password: "1234567",
      },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      code: "VALIDATION_ERROR",
      message: "Dados inválidos",
      fieldErrors: {
        password: ["Senha deve conter no minímo 12 caracteres"],
      },
    });
  });

  it("rejects a duplicate user email", async () => {
    await prisma.user.create({
      data: { email: "user@example.com" },
    });
    const response = await app.inject({
      method: "POST",
      path: "/auth/register",
      payload: {
        name: "user",
        email: "user@example.com",
        password: "123456789019109",
      },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      code: "CONFLICT",
      message: "Usuário já cadastrado",
    });
  });

  it("rejects duplicate email even with a difference of lower or uppercase", async () => {
    await prisma.user.create({
      data: { email: "user@example.com" },
    });
    const response = await app.inject({
      method: "POST",
      path: "/auth/register",
      payload: {
        name: "user",
        email: "User@example.com",
        password: "123456789019109",
      },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      code: "CONFLICT",
      message: "Usuário já cadastrado",
    });
  });
});
