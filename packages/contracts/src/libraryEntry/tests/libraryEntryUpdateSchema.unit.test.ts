import {
  type LibraryEntryUpdateInput,
  libraryEntryUpdateSchema,
} from "@library/contracts";
import { describe, expect, it } from "vitest";

describe("libraryEntryUpdateSchema public export", () => {
  it("parses an update through the contracts entry point", () => {
    const input = {
      status: "READING",
      currentPage: 12,
      rating: 4,
      review: "Bom livro",
    } satisfies LibraryEntryUpdateInput;

    expect(libraryEntryUpdateSchema.parse(input)).toEqual(input);
  });

  it("allows leaving review unchanged when omitted", () => {
    const input = { status: "READING" } satisfies LibraryEntryUpdateInput;
    const parsed = libraryEntryUpdateSchema.parse(input);

    expect(parsed).toEqual(input);
    expect(parsed).not.toHaveProperty("review");
  });

  it("allows clearing review with null", () => {
    const input = { review: null } satisfies LibraryEntryUpdateInput;

    expect(libraryEntryUpdateSchema.parse(input)).toEqual(input);
  });

  it("rejects an empty review", () => {
    expect(libraryEntryUpdateSchema.safeParse({ review: "" }).success).toBe(false);
  });

  it.each([0, 6, 4.5])("rejects rating %s", (rating) => {
    expect(libraryEntryUpdateSchema.safeParse({ rating }).success).toBe(false);
  });

  it.each([-1, 1.5])("rejects currentPage %s", (currentPage) => {
    expect(libraryEntryUpdateSchema.safeParse({ currentPage }).success).toBe(false);
  });
});
