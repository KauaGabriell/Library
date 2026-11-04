import { z } from "zod";

export const bookSourceUrlSchema = z
  .url()
  .refine((value) => new URL(value).protocol === "https:");

export const googleBookSchema = z.object({
  googleBooksId: z.string().min(1),
});

export const manualBookSchema = z.object({
  title: z.string().min(1),
  authors: z.array(z.string()).optional().default([]),
  description: z.string().optional(),
  descriptionSourceUrl: bookSourceUrlSchema.optional(),
  coverUrl: z.string().optional(),
  language: z.string().min(1).optional(),
  pageCount: z.int().min(1).optional(),
  pageCountSourceUrl: bookSourceUrlSchema.optional(),
});

export const bookPublicResponse = z.object({
  googleBooksId: z.string().min(1).nullable(),
  title: z.string().min(1),
  authors: z.array(z.string()).nullable(),
  description: z.string().nullable(),
  descriptionSourceUrl: bookSourceUrlSchema.nullable().optional(),
  coverUrl: z.string().nullable(),
  language: z.string().min(1).nullable(),
  pageCount: z.int().nullable(),
  pageCountSourceUrl: bookSourceUrlSchema.nullable().optional(),
});
export type GoogleBookInput = z.infer<typeof googleBookSchema>;
export type ManualBookInput = z.infer<typeof manualBookSchema>;
export type BookPublicResponse = z.infer<typeof bookPublicResponse>;
