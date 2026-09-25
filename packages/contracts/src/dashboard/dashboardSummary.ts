import { z } from "zod";
import { libraryEntryPublicResponseSchema } from "../libraryEntry/libraryEntry.js";
import { readingGoalResponseSchema } from "../readingGoal/readingGoalResponse.js";

export const dashboardSummaryResponseSchema = z.object({
  totalBooks: z.int().min(0),
  countsByStatus: z.object({
    WANT_TO_READ: z.int().min(0),
    READING: z.int().min(0),
    READ: z.int().min(0),
  }),
  averageRating: z.number().min(1).max(5).nullable(),
  recentEntries: libraryEntryPublicResponseSchema.array(),
  readingGoal: readingGoalResponseSchema.nullable(),
});

export type DashboardSummaryResponse = z.infer<
  typeof dashboardSummaryResponseSchema
>;
