import { z } from "zod";

export const googleBookSchema = z.object({
  googleBooksId: z.string().min(1),
});

export const manualBookSchema = z.object({
  title: z.string().min(1),
  authors: z.array(z.string()).optional().default([]),
  description: z.string().optional(),
  coverUrl: z.string().optional(),
  language: z.string().min(1).optional(),
  pageCount: z.int().optional(),
});

export const bookPublicResponse = z.object({
  googleBooksId: z.string().min(1).nullable(),
  title: z.string().min(1),
  authors: z.array(z.string()).nullable(),
  description: z.string().nullable(),
  coverUrl: z.string().nullable(),
  language: z.string().min(1).nullable(),
  pageCount: z.int().nullable(),
});
export type GoogleBookInput = z.infer<typeof googleBookSchema>;
export type ManualBookInput = z.infer<typeof manualBookSchema>;
export type BookPublicResponse = z.infer<typeof bookPublicResponse>;
