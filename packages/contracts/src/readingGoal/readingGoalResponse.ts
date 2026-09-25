import { z } from "zod";

export const readingGoalResponseSchema = z.object({
  year: z.int(),
  targetBooks: z.int().min(1).max(999),
  completedBooks: z.int().min(0),
  progressPercent: z.int().min(0).max(100),
});

export type ReadingGoalResponse = z.infer<typeof readingGoalResponseSchema>;
