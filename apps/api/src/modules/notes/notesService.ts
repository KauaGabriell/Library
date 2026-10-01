import { AppError } from "../../errors/appError";
import { type NotesListParams, notesRepository } from "./notesRepository";

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
};
