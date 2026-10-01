import { AppError } from "../../errors/appError";
import type {
  DeleteLibraryParams,
  ListLibraryParams,
  UpdateLibraryParams,
} from "./libraryRepository";
import { libraryRepository } from "./libraryRepository";
export const libraryService = {
  async listLibrarys({ userId, page, pageSize, status }: ListLibraryParams) {
    const librarys = await libraryRepository.listLibrary({
      userId,
      page,
      pageSize,
      status,
    });
    return librarys;
  },

  async updateLibrary({ userId, libraryId, patch }: UpdateLibraryParams) {
    const libraryEntry = await libraryRepository.findById(userId, libraryId);

    if (!libraryEntry)
      throw new AppError("Leitura não encontrada", 404, "NOT_FOUND");

    if (Object.keys(patch).length === 0) return libraryEntry;

    const resultingStatus = patch.status ?? libraryEntry.status;

    if (patch.currentPage !== undefined && resultingStatus !== "READING") {
      throw new AppError(
        "A página atual só pode ser alterada enquanto o livro está em leitura",
        400,
        "VALIDATION_ERROR",
      );
    }

    if (
      patch.currentPage !== undefined &&
      libraryEntry.book.pageCount !== null &&
      patch.currentPage > libraryEntry.book.pageCount
    ) {
      throw new AppError(
        "A página atual não pode ultrapassar o total de páginas do livro",
        400,
        "VALIDATION_ERROR",
      );
    }

    const isUpdatingEvaluation =
      patch.rating !== undefined || patch.review !== undefined;

    if (isUpdatingEvaluation && resultingStatus !== "READ") {
      throw new AppError(
        "Avaliação e resenha só podem ser alteradas quando o livro estiver marcado como lido",
        400,
        "VALIDATION_ERROR",
      );
    }

    const updatedLibrary = await libraryRepository.updateLibrary({
      userId,
      libraryId,
      patch,
    });
    return updatedLibrary;
  },

  async deleteLibrary({ userId, libraryId }: DeleteLibraryParams) {
    const library = await libraryRepository.findById(userId, libraryId);

    if (!library)
      throw new AppError("Leitura não encontrada", 404, "NOT_FOUND");

    const deletedLibrary = await libraryRepository.deleteLibrary({
      userId,
      libraryId,
    });
    return deletedLibrary;
  },
};
