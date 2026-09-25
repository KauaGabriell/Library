import { z } from "zod";

export const readingGoalSchema = z.object({
  year: z.int(),
  targetBooks: z.int().min(1).max(999),
});

export type ReadingGoalInput = z.infer<typeof readingGoalSchema>;
