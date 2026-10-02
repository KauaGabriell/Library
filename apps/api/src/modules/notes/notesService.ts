import { AppError } from "../../errors/appError";
import {
  type NoteInputWithOtherParams,
  type NotesListParams,
  notesRepository,
} from "./notesRepository";

export const notesService = {
  async getLibraryEntryDetails({ libraryId, userId }: NotesListParams) {
    const libraryEntryDetails = await notesRepository.getDetailById({
      libraryId,
      userId,
    });

    if (!libraryEntryDetails)
      throw new AppError("Leitura não encontrada", 404, "NOT_FOUND");

    return libraryEntryDetails;
  },

  async createNote({
    libraryEntryId,
    userId,
    content,
  }: NoteInputWithOtherParams) {
    const libraryEntry = await notesRepository.getDetailById({
      libraryId: libraryEntryId,
      userId,
    });

    if (!libraryEntry)
      throw new AppError("Leitura não encontrada", 404, "NOT_FOUND");

    if (libraryEntry.status === "WANT_TO_READ")
      throw new AppError(
        `Não é possível criar notas enquanto o livro está marcado como "Quero ler". Altere o status para "Lendo" ou "Lido"`,
        409,
        "CONFLICT",
      );

    const note = await notesRepository.createNote({
      libraryEntryId,
      userId,
      content,
    });

    return note;
  },
};
