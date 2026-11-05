import {
  type LibraryEntryDetailsPublicResponse,
  type LibraryEntryPublicResponse,
  libraryEntryDetailPublicResponseSchema,
  libraryEntryPublicResponseSchema,
  type PublicNoteResponse,
} from "@library/contracts";

type LibraryEntryForMapping = Omit<
  LibraryEntryPublicResponse,
  "createdAt" | "updatedAt" | "progressPercent"
> & {
  coverOverrideUrl?: string | null;
  pageCountOverride?: number | null;
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

function getProgressPercent(entry: LibraryEntryForMapping): number | null {
  if (entry.status === "READ") return 100;

  const pageCount = entry.pageCountOverride ?? entry.book.pageCount;

  if (
    entry.status !== "READING" ||
    entry.currentPage === null ||
    pageCount === null ||
    pageCount <= 0
  ) {
    return null;
  }

  return Math.floor((entry.currentPage / pageCount) * 100);
}

export function mapLibraryEntryToPublicResponse(
  entry: LibraryEntryForMapping,
): LibraryEntryPublicResponse {
  const hasPageCountOverride = entry.pageCountOverride != null;

  return libraryEntryPublicResponseSchema.parse({
    id: entry.id,
    status: entry.status,
    currentPage: entry.currentPage,
    progressPercent: getProgressPercent(entry),
    rating: entry.rating,
    review: entry.review,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
    book: {
      googleBooksId: entry.book.googleBooksId,
      title: entry.book.title,
      authors: entry.book.authors,
      description: entry.book.description,
      descriptionSourceUrl: entry.book.descriptionSourceUrl,
      coverUrl: entry.coverOverrideUrl ?? entry.book.coverUrl,
      language: entry.book.language,
      pageCount: entry.pageCountOverride ?? entry.book.pageCount,
      pageCountSourceUrl: hasPageCountOverride
        ? null
        : entry.book.pageCountSourceUrl,
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
