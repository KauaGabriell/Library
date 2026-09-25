import {
  type NoteInput,
  noteSchema,
  type PublicNoteResponse,
  publicNoteResponseSchema,
} from "@library/contracts";
import { describe, expect, it } from "vitest";

describe("notes public exports", () => {
  it("exports note schemas and inferred types from contracts entry point", () => {
    const input: NoteInput = { content: "Uma anotação" };
    const response: PublicNoteResponse = {
      id: "7c6a3ca5-6598-4bf4-89dd-52acff6ebec6",
      content: input.content,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    expect(noteSchema.parse(input)).toEqual(input);
    expect(publicNoteResponseSchema.parse(response)).toEqual(response);
  });

  it.each(["", "   ", "\n\t"])(
    "rejects empty or whitespace-only note content",
    (content) => {
      expect(noteSchema.safeParse({ content }).success).toBe(false);
    },
  );
});
