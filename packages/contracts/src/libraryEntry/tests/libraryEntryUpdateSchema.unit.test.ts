import { describe, expect, it } from "vitest";
import {
  type LibraryEntryUpdateInput,
  libraryEntryUpdateSchema,
} from "@library/contracts";

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
});
