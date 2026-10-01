import {
  type BookPublicResponse,
  bookPublicResponse,
  type LibraryEntryCreateInput,
  type LibraryEntryDetailsPublicResponse,
  type LibraryEntryListQuery,
  type LibraryEntryListResponse,
  type LibraryEntryPublicResponse,
  type PublicNoteResponse,
  libraryEntryCreateSchema,
  libraryEntryDetailPublicResponseSchema,
  libraryEntryListResponseSchema,
  libraryEntryListSchema,
  libraryEntryPublicResponseSchema,
} from "@library/contracts";
import { describe, expect, it } from "vitest";

describe("library entry public exports", () => {
  it("exports create and list schemas through contracts entry point", () => {
    const createInput = {
      googleBooksId: "google-book-123",
      source: "GOOGLE_BOOKS",
    } satisfies LibraryEntryCreateInput;
    const listQuery = {
      status: "READING",
      page: 2,
      pageSize: 20,
    } satisfies LibraryEntryListQuery;

    expect(libraryEntryCreateSchema.parse(createInput)).toEqual(createInput);
    expect(
      libraryEntryListSchema.parse({
        status: "READING",
        page: "2",
        pageSize: "20",
      }),
    ).toEqual(listQuery);
  });

  it("accepts Google Books input with only its source and ID", () => {
    const input = {
      source: "GOOGLE_BOOKS",
      googleBooksId: "google-book-123",
    } as const;

    expect(libraryEntryCreateSchema.parse(input)).toEqual(input);
  });

  it.each([
    ["missing Google Books ID", { source: "GOOGLE_BOOKS" }],
    ["client-provided catalog metadata", {
      source: "GOOGLE_BOOKS",
      googleBooksId: "google-book-123",
      title: "Client title",
    }],
    ["unknown source", { source: "OTHER", title: "Manual title" }],
    ["manual input without title", { source: "MANUAL" }],
  ])("rejects invalid book creation input: %s", (_caseName, input) => {
    expect(libraryEntryCreateSchema.safeParse(input).success).toBe(false);
  });

  it("defaults omitted manual authors to an empty array", () => {
    expect(
      libraryEntryCreateSchema.parse({ source: "MANUAL", title: "Manual title" }),
    ).toEqual({ source: "MANUAL", title: "Manual title", authors: [] });
  });

  it("accepts optional manual book metadata", () => {
    const input = {
      source: "MANUAL",
      title: "Manual title",
      authors: ["Author"],
      description: "Description",
      coverUrl: "https://example.com/cover.jpg",
      language: "pt-BR",
      pageCount: 240,
    } as const;

    expect(libraryEntryCreateSchema.parse(input)).toEqual(input);
  });

  it("defaults to first page and ten items", () => {
    expect(libraryEntryListSchema.parse({})).toEqual({
      page: 1,
      pageSize: 10,
    });
  });

  it.each([
    ["unknown status", { status: "PAUSED" }],
    ["page below minimum", { page: "0" }],
    ["fractional page", { page: "1.5" }],
    ["page size below minimum", { pageSize: "0" }],
    ["page size above maximum", { pageSize: "201" }],
  ])("rejects invalid list query: %s", (_caseName, query) => {
    expect(libraryEntryListSchema.safeParse(query).success).toBe(false);
  });

  it("exports public book and library entry response schemas", () => {
    const book = {
      googleBooksId: "google-book-123",
      title: "Livro de teste",
      authors: ["Autora"],
      description: null,
      coverUrl: null,
      language: null,
      pageCount: null,
    } satisfies BookPublicResponse;
    const entry = {
      id: "7c6a3ca5-6598-4bf4-89dd-52acff6ebec6",
      status: "READING",
      currentPage: null,
      rating: null,
      review: null,
      book,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    } satisfies LibraryEntryPublicResponse;
    const note = {
      id: "e31ce6b9-70f0-46e6-b56e-92e755b6e1e3",
      content: "Anotação válida",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    } satisfies PublicNoteResponse;
    const detail = {
      ...entry,
      notes: [note],
    } satisfies LibraryEntryDetailsPublicResponse;
    const list = {
      items: [entry],
      page: 1,
      pageSize: 10,
    } satisfies LibraryEntryListResponse;

    expect(bookPublicResponse.parse(book)).toEqual(book);
    expect(libraryEntryPublicResponseSchema.parse(entry)).toEqual(entry);
    expect(libraryEntryDetailPublicResponseSchema.parse(detail)).toEqual(
      detail,
    );
    expect(
      libraryEntryDetailPublicResponseSchema.safeParse({
        ...detail,
        notes: [{ ...note, content: "" }],
      }).success,
    ).toBe(false);
    expect(
      libraryEntryDetailPublicResponseSchema.safeParse({
        ...detail,
        notes: [{ ...note, content: "   " }],
      }).success,
    ).toBe(false);
    expect(
      libraryEntryDetailPublicResponseSchema.safeParse({
        ...detail,
        notes: [{ ...note, content: "a".repeat(10001) }],
      }).success,
    ).toBe(false);
    expect(libraryEntryListResponseSchema.parse(list)).toEqual(list);
  });
});
