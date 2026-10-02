import { createHash, randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { app } from "../../../app";
import { prisma } from "../../../lib/prisma";
import {
  createBook,
  createLibraryEntry,
  createUser,
} from "../../../test/factories";

const userIds = new Set<string>();
const bookIds = new Set<string>();

async function authenticatedUser() {
  const user = await createUser();
  userIds.add(user.id);

  const token = randomUUID();
  await prisma.session.create({
    data: {
      userId: user.id,
      tokenHash: createHash("sha256").update(token).digest("hex"),
      expiresAt: new Date(Date.now() + 60_000),
    },
  });

  return { user, cookie: `session=${token}` };
}

async function createEntry(
  userId: string,
  status: "WANT_TO_READ" | "READING" | "READ",
) {
  const book = await createBook({ title: `Notes fixture ${randomUUID()}` });
  bookIds.add(book.id);

  return createLibraryEntry({ userId, bookId: book.id, status });
}

afterEach(async () => {
  await prisma.libraryEntry.deleteMany({
    where: { userId: { in: [...userIds] } },
  });
  await prisma.book.deleteMany({ where: { id: { in: [...bookIds] } } });
  await prisma.session.deleteMany({ where: { userId: { in: [...userIds] } } });
  await prisma.user.deleteMany({ where: { id: { in: [...userIds] } } });

  userIds.clear();
  bookIds.clear();
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

describe("POST /library/:libraryId/notes", () => {
  it("rejects requests without a session", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/library/${randomUUID()}/notes`,
      payload: { content: "Anotação" },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      code: "UNAUTHENTICATED",
      message: "Não autenticado",
    });
  });

  it.each(["READING", "READ"] as const)(
    "creates a public note when entry status is %s",
    async (status) => {
      const { user, cookie } = await authenticatedUser();
      const entry = await createEntry(user.id, status);

      const response = await app.inject({
        method: "POST",
        url: `/library/${entry.id}/notes`,
        headers: { cookie },
        payload: { content: "Anotação de leitura" },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json()).toEqual({
        id: expect.any(String),
        content: "Anotação de leitura",
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
      expect(response.json()).not.toHaveProperty("libraryEntryId");
      expect(Date.parse(response.json().createdAt)).not.toBeNaN();
      expect(Date.parse(response.json().updatedAt)).not.toBeNaN();

      await expect(
        prisma.note.findUniqueOrThrow({ where: { id: response.json().id } }),
      ).resolves.toMatchObject({
        content: "Anotação de leitura",
        libraryEntryId: entry.id,
      });
    },
  );

  it("rejects note creation when entry status is WANT_TO_READ", async () => {
    const { user, cookie } = await authenticatedUser();
    const entry = await createEntry(user.id, "WANT_TO_READ");

    const response = await app.inject({
      method: "POST",
      url: `/library/${entry.id}/notes`,
      headers: { cookie },
      payload: { content: "Anotação" },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({ code: "CONFLICT" });
    expect(await prisma.note.count({ where: { libraryEntryId: entry.id } })).toBe(
      0,
    );
  });

  it("returns the same not-found response for foreign and missing entries", async () => {
    const owner = await authenticatedUser();
    const anotherUser = await authenticatedUser();
    const foreignEntry = await createEntry(anotherUser.user.id, "READING");

    const foreignResponse = await app.inject({
      method: "POST",
      url: `/library/${foreignEntry.id}/notes`,
      headers: { cookie: owner.cookie },
      payload: { content: "Não deve ser salva" },
    });
    const missingResponse = await app.inject({
      method: "POST",
      url: `/library/${randomUUID()}/notes`,
      headers: { cookie: owner.cookie },
      payload: { content: "Não deve ser salva" },
    });

    expect(foreignResponse.statusCode).toBe(404);
    expect(missingResponse.statusCode).toBe(404);
    expect(foreignResponse.json()).toEqual(missingResponse.json());
    expect(foreignResponse.json()).toEqual({
      code: "NOT_FOUND",
      message: "Leitura não encontrada",
    });
    expect(
      await prisma.note.count({ where: { libraryEntryId: foreignEntry.id } }),
    ).toBe(0);
  });

  it.each([
    ["missing content", {}],
    ["blank content", { content: "  \n " }],
    ["content over limit", { content: "a".repeat(10_001) }],
  ])("rejects %s", async (_scenario, payload) => {
    const { user, cookie } = await authenticatedUser();
    const entry = await createEntry(user.id, "READING");

    const response = await app.inject({
      method: "POST",
      url: `/library/${entry.id}/notes`,
      headers: { cookie },
      payload,
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
    expect(await prisma.note.count({ where: { libraryEntryId: entry.id } })).toBe(
      0,
    );
  });

  it("rejects an invalid library entry ID", async () => {
    const { cookie } = await authenticatedUser();

    const response = await app.inject({
      method: "POST",
      url: "/library/not-a-uuid/notes",
      headers: { cookie },
      payload: { content: "Anotação" },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
  });
});

describe("PATCH /notes/:noteId", () => {
  it("rejects requests without a session", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: `/notes/${randomUUID()}`,
      payload: { content: "Anotação atualizada" },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ code: "UNAUTHENTICATED" });
  });

  it.each(["READING", "READ"] as const)(
    "updates a note when entry status is %s",
    async (status) => {
      const { user, cookie } = await authenticatedUser();
      const entry = await createEntry(user.id, status);
      const note = await prisma.note.create({
        data: { libraryEntryId: entry.id, content: "Texto anterior" },
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/notes/${note.id}`,
        headers: { cookie },
        payload: { content: "Texto atualizado" },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        id: note.id,
        content: "Texto atualizado",
      });
      expect(response.json()).not.toHaveProperty("libraryEntryId");
      expect(
        await prisma.note.findUniqueOrThrow({ where: { id: note.id } }),
      ).toMatchObject({ content: "Texto atualizado" });
    },
  );

  it("rejects updates when entry status is WANT_TO_READ without changing the note", async () => {
    const { user, cookie } = await authenticatedUser();
    const entry = await createEntry(user.id, "WANT_TO_READ");
    const note = await prisma.note.create({
      data: { libraryEntryId: entry.id, content: "Texto original" },
    });

    const response = await app.inject({
      method: "PATCH",
      url: `/notes/${note.id}`,
      headers: { cookie },
      payload: { content: "Texto alterado" },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({ code: "CONFLICT" });
    expect(
      await prisma.note.findUniqueOrThrow({ where: { id: note.id } }),
    ).toMatchObject({ content: "Texto original" });
  });

  it("returns the same not-found response for foreign and missing notes", async () => {
    const owner = await authenticatedUser();
    const anotherUser = await authenticatedUser();
    const foreignEntry = await createEntry(anotherUser.user.id, "READING");
    const foreignNote = await prisma.note.create({
      data: { libraryEntryId: foreignEntry.id, content: "Nota privada" },
    });

    const foreignResponse = await app.inject({
      method: "PATCH",
      url: `/notes/${foreignNote.id}`,
      headers: { cookie: owner.cookie },
      payload: { content: "Tentativa de alteração" },
    });
    const missingResponse = await app.inject({
      method: "PATCH",
      url: `/notes/${randomUUID()}`,
      headers: { cookie: owner.cookie },
      payload: { content: "Tentativa de alteração" },
    });

    expect(foreignResponse.statusCode).toBe(404);
    expect(missingResponse.statusCode).toBe(404);
    expect(foreignResponse.json()).toEqual(missingResponse.json());
    expect(foreignResponse.json()).toEqual({
      code: "NOT_FOUND",
      message: "Nota não encontrada",
    });
    expect(
      await prisma.note.findUniqueOrThrow({ where: { id: foreignNote.id } }),
    ).toMatchObject({ content: "Nota privada" });
  });
});
