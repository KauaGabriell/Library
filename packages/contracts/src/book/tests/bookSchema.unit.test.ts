import { bookSchema } from "@library/contracts";
import { describe, expect, it } from "vitest";

describe("bookSchema public export", () => {
  it("rejects incomplete normalized book data", () => {
    expect(bookSchema.safeParse({ googleBooksId: "google-book-123" }).success).toBe(
      false,
    );
  });
});
