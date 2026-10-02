import { describe, expect, it } from "vitest";
import { mapNoteToPublicResponse } from "../notesMapper";

describe("mapNoteToPublicResponse", () => {
  it("converts dates to ISO and returns only public note fields", () => {
    const createdAt = new Date("2026-10-02T10:00:00.000Z");
    const updatedAt = new Date("2026-10-02T11:00:00.000Z");

    const result = mapNoteToPublicResponse({
      id: "7c6a3ca5-6598-4bf4-89dd-52acff6ebec6",
      content: "Anotação privada",
      createdAt,
      updatedAt,
    });

    expect(result).toEqual({
      id: "7c6a3ca5-6598-4bf4-89dd-52acff6ebec6",
      content: "Anotação privada",
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
    });
    expect(result).not.toHaveProperty("libraryEntryId");
  });
});
