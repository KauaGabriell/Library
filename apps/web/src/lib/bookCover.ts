import { envConfig } from "../config/env";

export const bookCoverFallbackUrl = "/book-cover-placeholder.jpg";

export function bookCoverImageSrc(coverUrl?: string | null): string {
  if (!coverUrl) return bookCoverFallbackUrl;
  if (!coverUrl.startsWith("/books/covers/")) return coverUrl;

  return new URL(coverUrl, envConfig.VITE_API_URL).toString();
}
