import type {
  BookSearchQuery,
  BookSearchResponse,
  LibraryEntryCreateInput,
} from "@library/contracts";
import { AppError } from "../../errors/appError";
import { isDuplicateLibraryEntry } from "../../middlewares/errorHandling";
import { type BooksRepository, booksRepository } from "./booksRepository";
import type { GoogleBooksCatalog } from "./googleBooksCatalog";
import { createGoogleBooksCatalog } from "./googleBooksCatalogAdapter";

type BooksServiceDependencies = {
  repository: BooksRepository;
  googleBooksCatalog: GoogleBooksCatalog;
};

export function createBooksService({
  repository,
  googleBooksCatalog,
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
