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
    const result = libraryEntryUpdateSchema.safeParse({ review: "" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "A resenha não pode estar vazia",
      );
    }
  });

  it.each([
    [0, "A avaliação deve ser no mínimo 1"],
    [6, "A avaliação não pode ser maior que 5"],
    [4.5, "A avaliação deve ser um número inteiro"],
  ])("returns a specific message for rating %s", (rating, message) => {
    const result = libraryEntryUpdateSchema.safeParse({ rating });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(message);
    }
  });

  it.each([
    [-1, "A página atual não pode ser negativa"],
    [1.5, "A página atual deve ser um número inteiro"],
  ])("returns a specific message for currentPage %s", (currentPage, message) => {
    const result = libraryEntryUpdateSchema.safeParse({ currentPage });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(message);
    }
  });
});
