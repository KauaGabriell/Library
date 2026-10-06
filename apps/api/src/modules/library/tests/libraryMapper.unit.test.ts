import { describe, expect, it } from "vitest";
import {
  mapLibraryEntryDetailsToPublicResponse,
  mapLibraryEntryToPublicResponse,
} from "../libraryMapper";

describe("mapLibraryEntryToPublicResponse", () => {
  const entry = {
    id: "7c6a3ca5-6598-4bf4-89dd-52acff6ebec6",
    status: "READING" as const,
    currentPage: 45,
    rating: null,
    review: null,
    createdAt: new Date("2026-10-01T10:00:00.000Z"),
    updatedAt: new Date("2026-10-01T11:00:00.000Z"),
    book: {
      googleBooksId: "google-book-123",
      title: "Livro de teste",
      authors: ["Autora"],
      description: null,
      coverUrl: null,
      language: null,
      pageCount: 200,
    },
  };

  it.each([
    ["reading with known page count", "READING", 45, 200, 22],
    ["completed book", "READ", 45, 200, 100],
    ["reading without page count", "READING", 45, null, null],
    ["reading without current page", "READING", null, 200, null],
    ["not started", "WANT_TO_READ", 0, 200, null],
  ] as const)(
    "returns progress for %s",
    (_caseName, status, currentPage, pageCount, progressPercent) => {
      const result = mapLibraryEntryToPublicResponse({
        ...entry,
        status,
        currentPage,
        book: { ...entry.book, pageCount },
      });

      expect(result.progressPercent).toBe(progressPercent);
    },
  );
});

describe("mapLibraryEntryDetailsToPublicResponse", () => {
  it("converts entry and note dates to ISO and omits internal fields", () => {
    const createdAt = new Date("2026-10-01T10:00:00.000Z");
    const updatedAt = new Date("2026-10-01T11:00:00.000Z");
    const noteCreatedAt = new Date("2026-10-01T10:30:00.000Z");
    const noteUpdatedAt = new Date("2026-10-01T10:45:00.000Z");

    const result = mapLibraryEntryDetailsToPublicResponse({
      id: "7c6a3ca5-6598-4bf4-89dd-52acff6ebec6",
      status: "READING",
      currentPage: 10,
      rating: null,
      review: null,
      createdAt,
      updatedAt,
      book: {
        googleBooksId: "google-book-123",
        title: "Livro de teste",
        authors: ["Autora"],
        description: null,
        coverUrl: null,
        language: null,
        pageCount: 200,
      },
      notes: [
        {
          id: "e31ce6b9-70f0-46e6-b56e-92e755b6e1e3",
          content: "Anotação privada",
          createdAt: noteCreatedAt,
          updatedAt: noteUpdatedAt,
        },
      ],
    });

    expect(result.createdAt).toBe(createdAt.toISOString());
    expect(result.updatedAt).toBe(updatedAt.toISOString());
    expect(result.notes[0]).toEqual({
      id: "e31ce6b9-70f0-46e6-b56e-92e755b6e1e3",
      content: "Anotação privada",
      createdAt: noteCreatedAt.toISOString(),
      updatedAt: noteUpdatedAt.toISOString(),
    });
    expect(result).not.toHaveProperty("userId");
    expect(result).not.toHaveProperty("bookId");
    expect(result.notes[0]).not.toHaveProperty("libraryEntryId");
  });
});
