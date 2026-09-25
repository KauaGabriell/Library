import { afterAll, afterEach, describe, expect, it } from "vitest";
import { prisma } from "../../../lib/prisma";
import {
  createBook as createTestBook,
  createLibraryEntry as createTestLibraryEntry,
  createReadingGoal as createTestReadingGoal,
  createUser as createTestUser,
} from "../../../test/factories";

const createdIds = {
  users: [] as string[],
  books: [] as string[],
  libraryEntries: [] as string[],
  readingGoals: [] as string[],
};

async function createUser() {
  const user = await createTestUser({
    email: `reading-domain-${crypto.randomUUID()}@example.com`,
  });
  createdIds.users.push(user.id);
  return user;
}

async function createBook() {
  const book = await createTestBook();
  createdIds.books.push(book.id);
  return book;
}

async function createLibraryEntry(userId: string, bookId: string) {
  const entry = await createTestLibraryEntry({ userId, bookId });
  createdIds.libraryEntries.push(entry.id);
  return entry;
}

async function createReadingGoal(
  userId: string,
  year: number,
  targetBooks = 12,
) {
  const goal = await createTestReadingGoal({ userId, year, targetBooks });
  createdIds.readingGoals.push(goal.id);
  return goal;
}

afterEach(async () => {
  await prisma.readingGoal.deleteMany({
    where: { id: { in: createdIds.readingGoals } },
  });
  await prisma.libraryEntry.deleteMany({
    where: { id: { in: createdIds.libraryEntries } },
  });
  await prisma.book.deleteMany({ where: { id: { in: createdIds.books } } });
  await prisma.user.deleteMany({ where: { id: { in: createdIds.users } } });

  createdIds.readingGoals.length = 0;
  createdIds.libraryEntries.length = 0;
  createdIds.books.length = 0;
  createdIds.users.length = 0;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("reading domain persistence", () => {
  it("allows the same book in different users' libraries", async () => {
    const book = await createBook();
    const firstUser = await createUser();
    const secondUser = await createUser();

    await createLibraryEntry(firstUser.id, book.id);
    await createLibraryEntry(secondUser.id, book.id);

    const entries = await prisma.libraryEntry.findMany({
      where: { bookId: book.id },
    });

    expect(entries).toHaveLength(2);
  });

  it("rejects a duplicate user and book pair", async () => {
    const user = await createUser();
    const book = await createBook();

    await createLibraryEntry(user.id, book.id);

    await expect(
      prisma.libraryEntry.create({
        data: { userId: user.id, bookId: book.id, status: "READING" },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("starts currentPage at zero", async () => {
    const user = await createUser();
    const book = await createBook();

    const entry = await createLibraryEntry(user.id, book.id);

    expect(entry.currentPage).toBe(0);
  });

  it("deletes notes when their library entry is deleted", async () => {
    const user = await createUser();
    const book = await createBook();
    const entry = await createLibraryEntry(user.id, book.id);
    const note = await prisma.note.create({
      data: { libraryEntryId: entry.id, content: "Nota de teste" },
    });

    await prisma.libraryEntry.delete({ where: { id: entry.id } });

    const persistedNote = await prisma.note.findUnique({
      where: { id: note.id },
    });

    expect(persistedNote).toBeNull();
  });

  it("rejects duplicate yearly goals for the same user", async () => {
    const user = await createUser();

    await createReadingGoal(user.id, 2026);

    await expect(
      prisma.readingGoal.create({
        data: { userId: user.id, year: 2026, targetBooks: 20 },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("allows goals for different years", async () => {
    const user = await createUser();

    await createReadingGoal(user.id, 2026);
    await createReadingGoal(user.id, 2027);

    const goals = await prisma.readingGoal.findMany({
      where: { userId: user.id },
    });

    expect(goals.map(({ year }) => year)).toEqual([2026, 2027]);
  });

  it.each([1, 999])("accepts targetBooks=%i", async (targetBooks) => {
    const user = await createUser();

    const goal = await createReadingGoal(user.id, 2026, targetBooks);

    expect(goal.targetBooks).toBe(targetBooks);
  });

  it.each([0, 1000])(
    "rejects targetBooks=%i at database level",
    async (targetBooks) => {
      const user = await createUser();

      await expect(
        prisma.readingGoal.create({
          data: { userId: user.id, year: 2026, targetBooks },
        }),
      ).rejects.toThrow();

      const goals = await prisma.readingGoal.findMany({
        where: { userId: user.id, year: 2026 },
      });

      expect(goals).toHaveLength(0);
    },
  );

  it("does not persist a library entry with an invalid book relation", async () => {
    const user = await createUser();

    await expect(
      prisma.libraryEntry.create({
        data: {
          userId: user.id,
          bookId: crypto.randomUUID(),
          status: "WANT_TO_READ",
        },
      }),
    ).rejects.toMatchObject({ code: "P2003" });

    const entries = await prisma.libraryEntry.findMany({
      where: { userId: user.id },
    });

    expect(entries).toHaveLength(0);
  });
});
