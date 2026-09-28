import type { BookSearchItem, BookSearchQuery } from "@library/contracts";

export type GoogleBookMetadata = {
  title: string;
  authors: string[];
  description: string | null;
  coverUrl: string | null;
  language: string | null;
  pageCount: number | null;
};

export type GoogleBooksSearchResult = {
  items: BookSearchItem[];
  hasMore: boolean;
};

export interface GoogleBooksCatalog {
  getById(googleBooksId: string): Promise<GoogleBookMetadata>;
  search({
    q,
    page,
    pageSize,
  }: BookSearchQuery): Promise<GoogleBooksSearchResult>;
}
