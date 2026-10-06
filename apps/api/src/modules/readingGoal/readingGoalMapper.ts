import type { ReadingGoalResponse } from "@library/contracts";

export function mapToReadingGoalPublicResponse(
  input: ReadingGoalResponse,
): ReadingGoalResponse {
  return {
    year: input.year,
    completedBooks: input.completedBooks,
    progressPercent: Number(input.progressPercent.toFixed(1)),
    targetBooks: input.targetBooks,
  };
}
