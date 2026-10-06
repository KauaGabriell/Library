import { z } from "zod";
import { bookPublicResponse } from "../book/bookSchema.js";
import { readingStateSchema } from "../book/readingState.js";
import { publicNoteResponseSchema } from "../notes/notes.js";

const googleCreateSchema = z.strictObject({
  source: z.literal("GOOGLE_BOOKS"),
  googleBooksId: z.string().min(1),
});

const manualCreateSchema = z.strictObject({
  source: z.literal("MANUAL"),
  title: z.string().min(1),
  authors: z.array(z.string()).default([]),
  description: z.string().optional(),
  coverUrl: z.string().optional(),
  language: z.string().optional(),
  pageCount: z.int().min(1).optional(),
});

export const libraryEntryCreateSchema = z.discriminatedUnion("source", [
  googleCreateSchema,
  manualCreateSchema,
]);

export const libraryEntryListSchema = z.object({
  status: readingStateSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(10),
});

export const libraryEntryUpdateSchema = z.object({
  status: readingStateSchema.optional(),
  currentPage: z
    .int({ message: "A página atual deve ser um número inteiro" })
    .min(0, { message: "A página atual não pode ser negativa" })
    .optional(),
  rating: z
    .int({ message: "A avaliação deve ser um número inteiro" })
    .min(1, { message: "A avaliação deve ser no mínimo 1" })
    .max(5, { message: "A avaliação não pode ser maior que 5" })
    .optional(),
  review: z
    .string()
    .min(1, { message: "A resenha não pode estar vazia" })
    .nullable()
    .optional(),
});

export const libraryEntryPublicResponseSchema = z.object({
  id: z.uuid(),
  status: readingStateSchema,
  currentPage: z.int().min(0).nullable(),
  progressPercent: z.int().min(0).max(100).nullable(),
  rating: z.int().min(1).max(5).nullable(),
  review: z.string().min(1).nullable(),
  book: bookPublicResponse,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const libraryEntryDetailPublicResponseSchema =
  libraryEntryPublicResponseSchema.extend({
    notes: z.array(publicNoteResponseSchema),
  });

export const libraryEntryListResponseSchema = z.object({
  items: libraryEntryPublicResponseSchema.array(),
  page: z.int().min(1),
  pageSize: z.int().min(1).max(200),
});

export const libraryEntryQuerySchema = z.object({
  libraryId: z.uuid(),
});

export const libraryEntryDeleteResponseSchema = z
  .undefined()
  .describe("Entrada removida; resposta sem corpo");

export type LibraryEntryCreateInput = z.infer<typeof libraryEntryCreateSchema>;

export type LibraryEntryListQuery = z.infer<typeof libraryEntryListSchema>;
export type LibraryEntryUpdateInput = z.infer<typeof libraryEntryUpdateSchema>;

export type LibraryEntryPublicResponse = z.infer<
  typeof libraryEntryPublicResponseSchema
>;
export type LibraryEntryListResponse = z.infer<
  typeof libraryEntryListResponseSchema
>;

export type LibraryEntryDetailsPublicResponse = z.infer<
  typeof libraryEntryDetailPublicResponseSchema
>;
