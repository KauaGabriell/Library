import { z } from "zod";

export const readingGoalResponseSchema = z.object({
  year: z.int(),
  targetBooks: z.int().min(1).max(999),
  completedBooks: z.int().min(0),
  progressPercent: z.int().min(0).max(100),
});

export const readingGoalDeleteResponseSchema = z
  .undefined()
  .describe("Meta de leitura removida; resposta sem corpo");

export type ReadingGoalResponse = z.infer<typeof readingGoalResponseSchema>;
