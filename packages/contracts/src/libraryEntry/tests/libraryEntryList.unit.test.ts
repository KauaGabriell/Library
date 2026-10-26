import {
  type LibraryEntryListQuery,
  type LibraryEntryListResponse,
  libraryEntryListResponseSchema,
  libraryEntryListSchema,
} from "@library/contracts";
import { describe, expect, it } from "vitest";

describe("library entry list query contract", () => {
  it("applies defaults for page, page size, and sort order", () => {
    const query: LibraryEntryListQuery = libraryEntryListSchema.parse({});

    expect(query).toEqual({
      page: 1,
      pageSize: 10,
      sortBy: "updatedAt",
    });
  });

  it("trims and accepts a valid title or author search term", () => {
    expect(libraryEntryListSchema.parse({ q: "  Duna  ", page: "2" })).toEqual({
      q: "Duna",
      page: 2,
      pageSize: 10,
      sortBy: "updatedAt",
    });
  });

  it.each(["", " ", "a", "  x  "])(
    "rejects a search term shorter than two non-whitespace characters: %j",
    (q) => {
      expect(libraryEntryListSchema.safeParse({ q }).success).toBe(false);
    },
  );

  it("accepts each reading status and supported sort field", () => {
    expect(
      libraryEntryListSchema.parse({ status: "READING", sortBy: "createdAt" }),
    ).toMatchObject({ status: "READING", sortBy: "createdAt" });
  });

  it.each([
    ["unknown status", { status: "PAUSED" }],
    ["unsupported sort field", { sortBy: "title" }],
    ["page below minimum", { page: "0" }],
    ["fractional page", { page: "1.5" }],
    ["page size below minimum", { pageSize: "0" }],
    ["page size above maximum", { pageSize: "201" }],
  ])("rejects %s", (_description, query) => {
    expect(libraryEntryListSchema.safeParse(query).success).toBe(false);
  });
});

describe("library entry list response contract", () => {
  it("requires complete pagination metadata and all status counts for empty results", () => {
    const response: LibraryEntryListResponse = {
      items: [],
      page: 1,
      pageSize: 10,
      totalItems: 0,
      totalPages: 0,
      countsByStatus: {
        WANT_TO_READ: 0,
        READING: 0,
        READ: 0,
      },
    };

    expect(libraryEntryListResponseSchema.parse(response)).toEqual(response);
  });

  it.each([
    ["missing a status count", { WANT_TO_READ: 1, READING: 0 }],
    ["negative total item count", { WANT_TO_READ: -1, READING: 0, READ: 0 }],
  ])("rejects a response with %s", (_description, countsByStatus) => {
    const response = {
      items: [],
      page: 1,
      pageSize: 10,
      totalItems: 0,
      totalPages: 0,
      countsByStatus,
    };

    expect(libraryEntryListResponseSchema.safeParse(response).success).toBe(
      false,
    );
  });
});
