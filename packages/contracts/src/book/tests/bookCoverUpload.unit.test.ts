import {
  BOOK_COVER_MAX_SIZE_BYTES,
  BOOK_COVER_MIME_TYPES,
} from "@library/contracts";
import { describe, expect, it } from "vitest";

describe("book cover upload contract constants", () => {
  it("allows JPEG, PNG, and WebP images up to 5 MiB", () => {
    expect(BOOK_COVER_MIME_TYPES).toEqual([
      "image/jpeg",
      "image/png",
      "image/webp",
    ]);
    expect(BOOK_COVER_MAX_SIZE_BYTES).toBe(5 * 1024 * 1024);
  });
});
