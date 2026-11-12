import { beforeEach, describe, expect, it, vi } from "vitest";

const repositoryMock = vi.hoisted(() => ({
  getNoteById: vi.fn(),
  getDetailById: vi.fn(),
  updateNote: vi.fn(),
  deleteNote: vi.fn(),
}));

vi.mock("../notesRepository", () => ({
  notesRepository: repositoryMock,
}));

import { notesService } from "../notesService";

const note = {
  id: "note-1",
  libraryEntryId: "entry-1",
  content: "Private note",
};

describe("notesService ownership checks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repositoryMock.getNoteById.mockResolvedValue(note);
    repositoryMock.getDetailById.mockResolvedValue({ status: "READING" });
    repositoryMock.updateNote.mockResolvedValue(note);
    repositoryMock.deleteNote.mockResolvedValue(note);
  });

  it("scopes note lookup to the authenticated user before updating", async () => {
    await notesService.updateNote({
      noteId: note.id,
      userId: "user-1",
      content: "Updated note",
    });

    expect(repositoryMock.getNoteById).toHaveBeenCalledExactlyOnceWith(
      note.id,
      "user-1",
    );
  });

  it("scopes note lookup to the authenticated user before deleting", async () => {
    await notesService.deleteNote(note.id, "user-1");

    expect(repositoryMock.getNoteById).toHaveBeenCalledExactlyOnceWith(
      note.id,
      "user-1",
    );
  });
});
