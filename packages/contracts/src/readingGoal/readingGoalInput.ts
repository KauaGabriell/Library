import { z } from "zod";

export const readingGoalSchema = z.object({
  targetBooks: z.int("Sua meta de livros deve ser um número.").min(1, "Você deve ter pelo menos 1 livro como meta").max(999, "A meta máxima é 999"),
});

export type ReadingGoalInput = z.infer<typeof readingGoalSchema>;
