import { manualBookSchema } from "@library/contracts";
import { describe, expect, it } from "vitest";

describe("bookSchema public export", () => {
  it("rejects incomplete normalized book data", () => {
    expect(
      manualBookSchema.safeParse({ googleBooksId: "google-book-123" }).success,
    ).toBe(false);
  });

  it.each([0, -1])("rejects a non-positive page count: %s", (pageCount) => {
    expect(
      manualBookSchema.safeParse({ title: "Manual book", pageCount }).success,
    ).toBe(false);
  });
});
