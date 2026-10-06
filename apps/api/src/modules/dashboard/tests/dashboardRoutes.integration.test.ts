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
  options: {
    status?: "WANT_TO_READ" | "READING" | "READ";
    rating?: number | null;
    title?: string;
  } = {},
) {
  const book = await createBook({
    title: options.title ?? `Dashboard fixture ${randomUUID()}`,
  });
  bookIds.add(book.id);

  const entry = await createLibraryEntry({
    userId,
    bookId: book.id,
    status: options.status ?? "WANT_TO_READ",
    ...(options.rating !== undefined && { rating: options.rating }),
  });

  return { book, entry };
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

describe("GET /dashboard", () => {
  it("rejects requests without a session", async () => {
    const response = await app.inject({ method: "GET", url: "/dashboard" });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      code: "UNAUTHENTICATED",
      message: "Não autenticado",
    });
  });

  it("returns zero counts, no ratings and no recent entries for an empty library", async () => {
    const { cookie } = await authenticatedUser();

    const response = await app.inject({
      method: "GET",
      url: "/dashboard",
      headers: { cookie },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      totalBooks: 0,
      countsByStatus: { WANT_TO_READ: 0, READING: 0, READ: 0 },
      averageRating: null,
      recentEntries: [],
      readingGoal: null,
    });
  });

  it("returns status counts and averages ratings only from READ entries", async () => {
    const { user, cookie } = await authenticatedUser();

    await createEntry(user.id);
    await createEntry(user.id);
    await createEntry(user.id, { status: "READING", rating: 5 });
    await createEntry(user.id, { status: "READ", rating: 2 });
    await createEntry(user.id, { status: "READ", rating: 4 });
    await createEntry(user.id, { status: "READ", rating: null });

    const response = await app.inject({
      method: "GET",
      url: "/dashboard",
      headers: { cookie },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      totalBooks: 6,
      countsByStatus: { WANT_TO_READ: 2, READING: 1, READ: 3 },
      averageRating: 3,
    });
  });

  it("returns null average when READ entries have no ratings", async () => {
    const { user, cookie } = await authenticatedUser();
    await createEntry(user.id, { status: "READ", rating: null });
    await createEntry(user.id, { status: "READ", rating: null });

    const response = await app.inject({
      method: "GET",
      url: "/dashboard",
      headers: { cookie },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      totalBooks: 2,
      countsByStatus: { WANT_TO_READ: 0, READING: 0, READ: 2 },
      averageRating: null,
    });
  });

  it("returns five most recently updated entries in descending order", async () => {
    const { user, cookie } = await authenticatedUser();
    const entries = [];

    for (let index = 0; index < 7; index += 1) {
      const { entry } = await createEntry(user.id, {
        title: `Recent book ${index}`,
      });
      const updatedAt = new Date(Date.UTC(2025, 0, index + 1));
      const updatedEntry = await prisma.libraryEntry.update({
        where: { id: entry.id },
        data: { updatedAt },
      });
      entries.push(updatedEntry);
    }

    const response = await app.inject({
      method: "GET",
      url: "/dashboard",
      headers: { cookie },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().recentEntries).toHaveLength(5);
    expect(
      response.json().recentEntries.map((entry: { id: string }) => entry.id),
    ).toEqual(entries.slice(-5).reverse().map((entry) => entry.id));
    expect(response.json().recentEntries[0].book.title).toBe("Recent book 6");
  });

  it("excludes another user's entries, counts and ratings", async () => {
    const owner = await authenticatedUser();
    const otherUser = await authenticatedUser();
    const { book: ownBook } = await createEntry(owner.user.id, {
      status: "READ",
      rating: 3,
      title: "Owner's book",
    });
    const { book: foreignBook } = await createEntry(otherUser.user.id, {
      status: "READ",
      rating: 5,
      title: "Other user's book",
    });

    const response = await app.inject({
      method: "GET",
      url: "/dashboard",
      headers: { cookie: owner.cookie },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      totalBooks: 1,
      countsByStatus: { WANT_TO_READ: 0, READING: 0, READ: 1 },
      averageRating: 3,
    });
    expect(
      response.json().recentEntries.map(
        (entry: { book: { title: string } }) => entry.book.title,
      ),
    ).toEqual([ownBook.title]);
    expect(response.json().recentEntries[0].book.title).not.toBe(foreignBook.title);
  });

  it("recalculates goal progress after status changes and entry deletion", async () => {
    const { user, cookie } = await authenticatedUser();
    const goalResponse = await app.inject({
      method: "PUT",
      url: "/reading-goal",
      headers: { cookie },
      payload: { targetBooks: 2 },
    });
    const { entry } = await createEntry(user.id);

    expect(goalResponse.statusCode).toBe(200);
    expect(goalResponse.json()).toMatchObject({
      targetBooks: 2,
      completedBooks: 0,
      progressPercent: 0,
    });

    const markAsRead = await app.inject({
      method: "PATCH",
      url: `/library/${entry.id}`,
      headers: { cookie },
      payload: { status: "READ" },
    });
    const afterStatusChange = await app.inject({
      method: "GET",
      url: "/dashboard",
      headers: { cookie },
    });

    expect(markAsRead.statusCode).toBe(200);
    expect(afterStatusChange.json().readingGoal).toMatchObject({
      targetBooks: 2,
      completedBooks: 1,
      progressPercent: 50,
    });

    const deleteEntry = await app.inject({
      method: "DELETE",
      url: `/library/${entry.id}`,
      headers: { cookie },
    });
    const afterDeletion = await app.inject({
      method: "GET",
      url: "/dashboard",
      headers: { cookie },
    });

    expect(deleteEntry.statusCode).toBe(204);
    expect(afterDeletion.json().readingGoal).toMatchObject({
      targetBooks: 2,
      completedBooks: 0,
      progressPercent: 0,
    });
  });

  it("caps progress at 100 percent when completed books exceed the goal", async () => {
    const { user, cookie } = await authenticatedUser();
    const goalResponse = await app.inject({
      method: "PUT",
      url: "/reading-goal",
      headers: { cookie },
      payload: { targetBooks: 2 },
    });
    await createEntry(user.id, { status: "READ" });
    await createEntry(user.id, { status: "READ" });

    const atGoal = await app.inject({
      method: "GET",
      url: "/dashboard",
      headers: { cookie },
    });
    await createEntry(user.id, { status: "READ" });
    const aboveGoal = await app.inject({
      method: "GET",
      url: "/dashboard",
      headers: { cookie },
    });

    expect(goalResponse.statusCode).toBe(200);
    expect(atGoal.json().readingGoal).toMatchObject({
      targetBooks: 2,
      completedBooks: 2,
      progressPercent: 100,
    });
    expect(aboveGoal.json().readingGoal).toMatchObject({
      targetBooks: 2,
      completedBooks: 3,
      progressPercent: 100,
    });
  });

  it("uses only the authenticated user's completed books for progress", async () => {
    const owner = await authenticatedUser();
    const otherUser = await authenticatedUser();
    const ownerGoal = await app.inject({
      method: "PUT",
      url: "/reading-goal",
      headers: { cookie: owner.cookie },
      payload: { targetBooks: 10 },
    });
    await app.inject({
      method: "PUT",
      url: "/reading-goal",
      headers: { cookie: otherUser.cookie },
      payload: { targetBooks: 30 },
    });
    await createEntry(owner.user.id, { status: "READ" });
    await createEntry(otherUser.user.id, { status: "READ" });
    await createEntry(otherUser.user.id, { status: "READ" });

    const response = await app.inject({
      method: "GET",
      url: "/dashboard",
      headers: { cookie: owner.cookie },
    });

    expect(ownerGoal.statusCode).toBe(200);
    expect(response.json().readingGoal).toMatchObject({
      targetBooks: 10,
      completedBooks: 1,
      progressPercent: 10,
    });
  });
});
