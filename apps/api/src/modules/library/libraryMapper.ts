import {
  type LibraryEntryDetailsPublicResponse,
  type LibraryEntryPublicResponse,
  libraryEntryDetailPublicResponseSchema,
  libraryEntryPublicResponseSchema,
  type PublicNoteResponse,
} from "@library/contracts";

type LibraryEntryForMapping = Omit<
  LibraryEntryPublicResponse,
  "createdAt" | "updatedAt"
> & {
  createdAt: Date;
  updatedAt: Date;
};

type NoteForMapping = Omit<PublicNoteResponse, "createdAt" | "updatedAt"> & {
  createdAt: Date;
  updatedAt: Date;
};

type LibraryEntryDetailsForMapping = LibraryEntryForMapping & {
  notes: NoteForMapping[];
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

export function mapLibraryEntryDetailsToPublicResponse(
  entry: LibraryEntryDetailsForMapping,
): LibraryEntryDetailsPublicResponse {
  return libraryEntryDetailPublicResponseSchema.parse({
    ...mapLibraryEntryToPublicResponse(entry),
    notes: entry.notes.map((note) => ({
      id: note.id,
      content: note.content,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    })),
  });
}
