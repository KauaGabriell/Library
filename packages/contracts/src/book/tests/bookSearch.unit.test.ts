import {
  bookSearchItemSchema,
  bookSearchResponseSchema,
  bookSearchSchema,
} from "@library/contracts";
import { describe, expect, it } from "vitest";

describe("bookSearchSchema public contract", () => {
  it("trims q and applies default pagination", () => {
    expect(bookSearchSchema.parse({ q: "  dune  " })).toEqual({
      q: "dune",
      page: 1,
      pageSize: 10,
    });
  });

  it("accepts explicit page and page size", () => {
    expect(
      bookSearchSchema.parse({ q: "dune", page: "2", pageSize: "5" }),
    ).toEqual({
      q: "dune",
      page: 2,
      pageSize: 5,
    });
  });

  it.each(["", "   "])("rejects empty q value %j", (q) => {
    expect(bookSearchSchema.safeParse({ q }).success).toBe(false);
  });

  it.each([
    ["page below minimum", { q: "dune", page: "0" }],
    ["fractional page", { q: "dune", page: "1.5" }],
    ["page size below minimum", { q: "dune", pageSize: "0" }],
    ["page size above maximum", { q: "dune", pageSize: "41" }],
    ["fractional page size", { q: "dune", pageSize: "5.5" }],
  ])("rejects %s", (_description, query) => {
    expect(bookSearchSchema.safeParse(query).success).toBe(false);
  });
});

describe("bookSearchItemSchema public contract", () => {
  it("accepts a normalized Google Books item", () => {
    expect(
      bookSearchItemSchema.parse({
        googleBooksId: "google-book-123",
        title: "Dune",
        authors: ["Frank Herbert"],
        description: null,
        coverUrl: null,
        language: "en",
        pageCount: 412,
      }),
    ).toEqual({
      googleBooksId: "google-book-123",
      title: "Dune",
      authors: ["Frank Herbert"],
      description: null,
      coverUrl: null,
      language: "en",
      pageCount: 412,
    });
  });

  it("requires a Google Books ID and an authors array", () => {
    const item = {
      title: "Dune",
      authors: ["Frank Herbert"],
      description: null,
      coverUrl: null,
      language: "en",
      pageCount: 412,
    };

    expect(bookSearchItemSchema.safeParse(item).success).toBe(false);
    expect(
      bookSearchItemSchema.safeParse({
        ...item,
        googleBooksId: "google-book-123",
        authors: null,
      }).success,
    ).toBe(false);
  });
});

describe("bookSearchResponseSchema public contract", () => {
  it("accepts normalized items and a next page", () => {
    expect(
      bookSearchResponseSchema.parse({
        items: [
          {
            googleBooksId: "google-book-123",
            title: "Dune",
            authors: ["Frank Herbert"],
            description: null,
            coverUrl: null,
            language: "en",
            pageCount: 412,
          },
        ],
        page: 1,
        nextPage: 2,
      }),
    ).toMatchObject({ page: 1, nextPage: 2, items: [{ title: "Dune" }] });
  });

  it("accepts an empty catalog result with no next page", () => {
    expect(
      bookSearchResponseSchema.parse({
        items: [],
        page: 3,
        nextPage: null,
      }),
    ).toEqual({ items: [], page: 3, nextPage: null });
  });

  it.each([
    ["zero page", { items: [], page: 0, nextPage: null }],
    ["fractional page", { items: [], page: 1.5, nextPage: null }],
    ["zero next page", { items: [], page: 1, nextPage: 0 }],
    ["fractional next page", { items: [], page: 1, nextPage: 2.5 }],
  ])("rejects %s", (_description, response) => {
    expect(bookSearchResponseSchema.safeParse(response).success).toBe(false);
  });
});
