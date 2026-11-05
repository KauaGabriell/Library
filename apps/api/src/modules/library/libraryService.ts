import { AppError } from "../../errors/appError";
import {
  bookCoverStorage,
  getStoredBookCoverFilename,
} from "../books/bookCoverStorage";
import type {
  DeleteLibraryParams,
  ListLibraryParams,
  UpdateLibraryParams,
} from "./libraryRepository";
import { libraryRepository } from "./libraryRepository";

type UpdateLibraryCoverInput = {
  userId: string;
  libraryId: string;
  file: Buffer;
  mimeType: string;
};

export const libraryService = {
  async listLibraryEntries(params: ListLibraryParams) {
    return libraryRepository.listLibrary(params);
  },

  async updateLibrary({ userId, libraryId, patch }: UpdateLibraryParams) {
    const libraryEntry = await libraryRepository.findById(userId, libraryId);

    if (!libraryEntry)
      throw new AppError("Leitura não encontrada", 404, "NOT_FOUND");

    if (Object.keys(patch).length === 0) return libraryEntry;

    const resultingStatus = patch.status ?? libraryEntry.status;
    const resultingPageCount =
      patch.pageCount === undefined
        ? (libraryEntry.pageCountOverride ?? libraryEntry.book.pageCount)
        : (patch.pageCount ?? libraryEntry.book.pageCount);
    const resultingCurrentPage = patch.currentPage ?? libraryEntry.currentPage;

    if (patch.currentPage !== undefined && resultingStatus !== "READING") {
      throw new AppError(
        "A página atual só pode ser alterada enquanto o livro está em leitura",
        400,
        "VALIDATION_ERROR",
      );
    }

    if (
      (patch.currentPage !== undefined || patch.pageCount !== undefined) &&
      resultingPageCount !== null &&
      resultingCurrentPage !== null &&
      resultingCurrentPage > resultingPageCount
    ) {
      throw new AppError(
        "O total de páginas não pode ser menor que a página atual registrada",
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

  async updateLibraryCover({
    userId,
    libraryId,
    file,
    mimeType,
  }: UpdateLibraryCoverInput) {
    const currentEntry = await libraryRepository.findById(userId, libraryId);
    if (!currentEntry) {
      throw new AppError("Leitura não encontrada", 404, "NOT_FOUND");
    }

    const storedCover = await bookCoverStorage.save(file, mimeType);
    let updatedEntry: Awaited<
      ReturnType<typeof libraryRepository.updateLibraryCover>
    >;

    try {
      updatedEntry = await libraryRepository.updateLibraryCover({
        userId,
        libraryId,
        coverOverrideUrl: storedCover.url,
      });
    } catch (error) {
      try {
        await bookCoverStorage.remove(storedCover.filename);
      } catch (cleanupError) {
        throw new AggregateError(
          [error, cleanupError],
          "Failed to update library cover and clean up the new file",
        );
      }

      throw error;
    }

    return {
      entry: updatedEntry,
      previousCoverFilename: getStoredBookCoverFilename(
        currentEntry.coverOverrideUrl,
      ),
    };
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
