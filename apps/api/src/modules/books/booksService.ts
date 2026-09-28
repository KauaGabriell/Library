import type { LibraryEntryCreateInput } from "@library/contracts";
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
      if (input.source === "MANUAL") {
        return repository.createManualBookAndLibraryEntry(userId, input);
      }

      const existingBook = await repository.findGoogleBook(input.googleBooksId);

      if (existingBook) {
        return repository.createLibraryEntryForBook(userId, existingBook.id);
      }

      const metadata = await googleBooksCatalog.getById(input.googleBooksId);

      return repository.createGoogleBookAndLibraryEntry(
        userId,
        input.googleBooksId,
        metadata,
      );
    },
  };
}

export const booksService = createBooksService({
  repository: booksRepository,
  googleBooksCatalog: createGoogleBooksCatalog(),
});
