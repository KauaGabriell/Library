import type {
  BookSearchQuery,
  BookSearchResponse,
  LibraryEntryCreateInput,
} from "@library/contracts";
import { AppError } from "../../errors/appError";
import { isDuplicateLibraryEntry } from "../../middlewares/errorHandling";
import {
  type BookCoverStorage,
  bookCoverStorage as defaultBookCoverStorage,
} from "./bookCoverStorage";
import { type BooksRepository, booksRepository } from "./booksRepository";
import type { GoogleBooksCatalog } from "./googleBooksCatalog";
import { createGoogleBooksCatalog } from "./googleBooksCatalogAdapter";

type ManualBookInput = Omit<
  Extract<LibraryEntryCreateInput, { source: "MANUAL" }>,
  "coverUrl"
>;

type BooksServiceDependencies = {
  repository: BooksRepository;
  googleBooksCatalog: GoogleBooksCatalog;
  bookCoverStorage?: BookCoverStorage;
};

export function createBooksService({
  repository,
  googleBooksCatalog,
  bookCoverStorage = defaultBookCoverStorage,
}: BooksServiceDependencies) {
  return {
    async addToLibrary(userId: string, input: LibraryEntryCreateInput) {
      try {
        if (input.source === "MANUAL") {
          return await repository.createManualBookAndLibraryEntry(
            userId,
            input,
          );
        }

        const existingBook = await repository.findGoogleBook(
          input.googleBooksId,
        );

        if (existingBook) {
          return await repository.createLibraryEntryForBook(
            userId,
            existingBook.id,
          );
        }

        const metadata = await googleBooksCatalog.getById(input.googleBooksId);

        return await repository.createGoogleBookAndLibraryEntry(
          userId,
          input.googleBooksId,
          metadata,
        );
      } catch (error) {
        if (isDuplicateLibraryEntry(error)) {
          throw new AppError(
            "Este livro já está na sua biblioteca",
            409,
            "CONFLICT",
          );
        }

        throw error;
      }
    },

    async addManualBookWithCover(
      userId: string,
      input: ManualBookInput,
      image: { file: Buffer; mimeType: string },
    ) {
      const storedCover = await bookCoverStorage.save(
        image.file,
        image.mimeType,
      );

      try {
        return await repository.createManualBookAndLibraryEntry(userId, {
          ...input,
          coverUrl: storedCover.url,
        });
      } catch (error) {
        try {
          await bookCoverStorage.remove(storedCover.filename);
        } catch (cleanupError) {
          throw new AggregateError(
            [error, cleanupError],
            "Failed to persist manual book and clean up its cover",
          );
        }

        throw error;
      }
    },

    async searchBook({
      q,
      page,
      pageSize,
    }: BookSearchQuery): Promise<BookSearchResponse> {
      const result = await googleBooksCatalog.search({ q, page, pageSize });
      return {
        items: result.items,
        page: page,
        nextPage: result.hasMore ? page + 1 : null,
      };
    },
  };
}

export const booksService = createBooksService({
  repository: booksRepository,
  googleBooksCatalog: createGoogleBooksCatalog({}),
});
