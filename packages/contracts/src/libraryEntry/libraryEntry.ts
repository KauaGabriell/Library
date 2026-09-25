import { z } from "zod";
import { readingStateSchema } from "../book/readingState.js";

export const libraryEntryUpdateSchema = z.object({
  status: readingStateSchema.optional(),
  currentPage: z.int().min(0).optional(),
  rating: z.int().min(1).max(5).optional(),
  review: z.string().optional(),
});

export type LibraryEntryUpdateInput = z.infer<typeof libraryEntryUpdateSchema>;
