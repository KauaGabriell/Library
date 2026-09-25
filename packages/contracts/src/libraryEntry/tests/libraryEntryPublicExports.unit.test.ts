import {
  type BookPublicResponse,
  type LibraryEntryDetailsPublicResponse,
  type LibraryEntryCreateInput,
  type LibraryEntryListResponse,
  type LibraryEntryListQuery,
  type LibraryEntryPublicResponse,
  bookPublicResponse,
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
    } satisfies LibraryEntryCreateInput;
    const listQuery = {
      status: "READING",
      page: 2,
      pageSize: 20,
    } satisfies LibraryEntryListQuery;

    expect(libraryEntryCreateSchema.parse(createInput)).toEqual(createInput);
    expect(
      libraryEntryListSchema.parse({ status: "READING", page: "2", pageSize: "20" }),
    ).toEqual(listQuery);
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
    const detail = {
      ...entry,
      notes: [],
    } satisfies LibraryEntryDetailsPublicResponse;
    const list = {
      items: [entry],
      page: 1,
      pageSize: 10,
    } satisfies LibraryEntryListResponse;

    expect(bookPublicResponse.parse(book)).toEqual(book);
    expect(libraryEntryPublicResponseSchema.parse(entry)).toEqual(entry);
    expect(libraryEntryDetailPublicResponseSchema.parse(detail)).toEqual(detail);
    expect(libraryEntryListResponseSchema.parse(list)).toEqual(list);
  });
});
