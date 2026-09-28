export type GoogleBookMetadata = {
  title: string;
  authors: string[];
  description: string | null;
  coverUrl: string | null;
  language: string | null;
  pageCount: number | null;
};

export interface GoogleBooksCatalog {
  getById(googleBooksId: string): Promise<GoogleBookMetadata>;
}
