import { z } from "zod";
import { bookPublicResponse } from "../book/bookSchema.js";
import { readingStateSchema } from "../book/readingState.js";
import { publicNoteResponseSchema } from "../notes/notes.js";

export const libraryEntryCreateSchema = z.object({
  googleBooksId: z.string().min(1),
});

export const libraryEntryListSchema = z.object({
  status: readingStateSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(10),
});

export const libraryEntryUpdateSchema = z.object({
  status: readingStateSchema.optional(),
  currentPage: z.int().min(0).optional(),
  rating: z.int().min(1).max(5).optional(),
  review: z.string().min(1).nullable().optional()
});

export const libraryEntryPublicResponseSchema = z.object({
  id: z.uuid(),
  status: readingStateSchema,
  currentPage: z.int().min(0).nullable(),
  rating: z.int().min(1).max(5).nullable(),
  review: z.string().min(1).nullable(),
  book: bookPublicResponse,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const libraryEntryDetailPublicResponseSchema =
  libraryEntryPublicResponseSchema.extend({
    notes: publicNoteResponseSchema.array(),
  });

export const libraryEntryListResponseSchema = z.object({
  items: libraryEntryPublicResponseSchema.array(),
  page: z.int().min(1),
  pageSize: z.int().min(1).max(200),
});

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
