import { z } from "zod";
import { bookPublicResponse } from "./bookSchema.js";

export const bookSearchSchema = z.object({
  q: z.string().trim().min(1).regex(/\S/),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(40).default(10),
});

export const bookSearchItemSchema = bookPublicResponse.extend({
  googleBooksId: z.string().min(1),
  authors: z.array(z.string()),
});

export const bookSearchResponseSchema = z.object({
  items: z.array(bookSearchItemSchema),
  page: z.number().int().positive(),
  nextPage: z.number().int().positive().nullable(),
});

export type BookSearchQuery = z.infer<typeof bookSearchSchema>;
export type BookSearchResponse = z.infer<typeof bookSearchResponseSchema>;
export type BookSearchItem = z.infer<typeof bookSearchItemSchema>;
