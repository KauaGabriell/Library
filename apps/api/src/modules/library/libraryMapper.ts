import {
  type LibraryEntryPublicResponse,
  libraryEntryPublicResponseSchema,
} from "@library/contracts";

type LibraryEntryForMapping = Omit<
  LibraryEntryPublicResponse,
  "createdAt" | "updatedAt"
> & {
  createdAt: Date;
  updatedAt: Date;
};

export function mapLibraryEntryToPublicResponse(
  entry: LibraryEntryForMapping,
): LibraryEntryPublicResponse {
  return libraryEntryPublicResponseSchema.parse({
    id: entry.id,
    status: entry.status,
    currentPage: entry.currentPage,
    rating: entry.rating,
    review: entry.review,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
    book: {
      googleBooksId: entry.book.googleBooksId,
      title: entry.book.title,
      authors: entry.book.authors,
      description: entry.book.description,
      coverUrl: entry.book.coverUrl,
      language: entry.book.language,
      pageCount: entry.book.pageCount,
    },
  });
}
