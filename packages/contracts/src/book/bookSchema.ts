import { z } from "zod";

export const bookSchema = z.object({
  googleBooksId: z.string().min(1),
  title: z.string().min(1),
  authors: z.array(z.string()),
  description: z.string().optional(),
  coverUrl: z.string().optional(),
  language: z.string().min(1).optional(),
  pageCount: z.int().optional(),
});

export const bookPublicResponse = z.object({
  googleBooksId: z.string().min(1),
  title: z.string().min(1),
  authors: z.array(z.string()),
  description: z.string().nullable(),
  coverUrl: z.string().nullable(),
  language: z.string().min(1).nullable(),
  pageCount: z.int().nullable(),
});

export type BookInput = z.infer<typeof bookSchema>;
export type BookPublicResponse = z.infer<typeof bookPublicResponse>;
