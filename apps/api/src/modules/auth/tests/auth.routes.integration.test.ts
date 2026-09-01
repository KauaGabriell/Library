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

describe("POST /auth/login", () => {
  it("valid login returns 200, session cookie and public user.", async () => {
    const password = "123456789123";
    const passwordHash = await argon2.hash(password);

    const seedUser = await prisma.user.create({
      data: {
        name: "seeduser",
        email: "seeduser@example.com",
        passwordHash,
      },
    });

    const response = await app.inject({
      method: "POST",
      path: "/auth/login",
      payload: {
        email: "Seeduser@example.com",
        password: "123456789123",
      },
    });

    const session = await prisma.session.findFirst({
      where: { userId: seedUser.id },
      select: { tokenHash: true },
    });

    const setCookie = response.headers["set-cookie"];
    const token = response.cookies[0]?.value;

    if (!session) throw new Error("Sessão não encontrada!");
    if (!token) throw Error("Token não fornecido");

    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Lax");

    expect(session.tokenHash).toBe(
      createHash("sha256").update(token).digest("hex"),
    );

    expect(response.json()).toEqual({
      id: expect.any(String),
      name: "seeduser",
      email: "seeduser@example.com",
      avatarUrl: null,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).not.toHaveProperty("token");
    expect(response.json()).not.toHaveProperty("password");
    expect(response.json()).not.toHaveProperty("passwordHash");
    expect(session.tokenHash).not.toBe(token);
  });

  it("returns 401 for invalid password", async () => {
    const password = "123456789123";
    const passwordHash = await argon2.hash(password);

    const seedUser = await prisma.user.create({
      data: {
        name: "seeduser",
        email: "seeduser@example.com",
        passwordHash,
      },
    });

    const response = await app.inject({
      method: "POST",
      path: "/auth/login",
      payload: {
        email: "seeduser@example.com",
        password: "123456789123456",
      },
    });
    const session = await prisma.session.findFirst({
      where: { userId: seedUser.id },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      code: "UNAUTHENTICATED",
      message: "Credenciais inválidas",
    });
    expect(response.headers["set-cookie"]).toBeUndefined();
    expect(session).toBeNull();
  });

  it("returns 401 for nonexistent email", async () => {
    const password = "123456789123";
    const passwordHash = await argon2.hash(password);

    const seedUser = await prisma.user.create({
      data: {
        name: "seeduser",
        email: "seeduser@example.com",
        passwordHash,
      },
    });

    const response = await app.inject({
      method: "POST",
      path: "/auth/login",
      payload: {
        email: "seeduser123@example.com",
        password: "123456789123",
      },
    });

    const session = await prisma.session.findFirst({
      where: { userId: seedUser.id },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      code: "UNAUTHENTICATED",
      message: "Credenciais inválidas",
    });
    expect(response.headers["set-cookie"]).toBeUndefined();
    expect(session).toBeNull();
  });

  it("returns 401 for oAuth account login", async () => {
    const seedUser = await prisma.user.create({
      data: {
        name: "seeduser",
        email: "seeduser@example.com",
        passwordHash: null,
      },
    });

    const response = await app.inject({
      method: "POST",
      path: "/auth/login",
      payload: {
        email: "seeduser@example.com",
        password: "123456789123",
      },
    });

    const session = await prisma.session.findFirst({
      where: { userId: seedUser.id },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      code: "UNAUTHENTICATED",
      message: "Credenciais inválidas",
    });
    expect(response.headers["set-cookie"]).toBeUndefined();
    expect(session).toBeNull();
  });
});
