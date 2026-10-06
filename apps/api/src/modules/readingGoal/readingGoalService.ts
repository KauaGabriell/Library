import { AppError } from "../../errors/appError";
import { mapToReadingGoalPublicResponse } from "./readingGoalMapper";
import {
  type CreateReadingGoalInput,
  readingGoalRepository,
} from "./readingRepository";

function mapReadingGoalWithProgress(
  readingGoal: { year: number; targetBooks: number },
  completedBooks: number,
) {
  const progressPercent = Math.min(
    100,
    Math.floor((completedBooks / readingGoal.targetBooks) * 100),
  );

  return mapToReadingGoalPublicResponse({
    completedBooks,
    progressPercent,
    targetBooks: readingGoal.targetBooks,
    year: readingGoal.year,
  });
}

export const readingGoalService = {
  async createReadingGoal({ targetBooks, userId }: CreateReadingGoalInput) {
    const hasReadingGoal =
      await readingGoalRepository.getUserReadingGoal(userId);

    if (hasReadingGoal)
      throw new AppError(
        "Você já tem uma meta de leitura associada a sua conta",
        409,
        "CONFLICT",
      );

    const readingGoal = await readingGoalRepository.createReadingGoal({
      targetBooks,
      userId,
    });

    const completedBooks = await readingGoalRepository.getReadBooks(userId);
    return mapReadingGoalWithProgress(readingGoal, completedBooks);
  },

  async upsertReadingGoal({ userId, targetBooks }: CreateReadingGoalInput) {
    const readingGoal = await readingGoalRepository.upsertReadingGoal({
      userId,
      targetBooks,
    });
    const completedBooks = await readingGoalRepository.getReadBooks(userId);

    return mapReadingGoalWithProgress(readingGoal, completedBooks);
  },

  async getReadingGoal(userId: string) {
    const readingGoal = await readingGoalRepository.getUserReadingGoal(userId);

    if (!readingGoal) return null;

    const completedBooks = await readingGoalRepository.getReadBooks(userId);
    return mapReadingGoalWithProgress(readingGoal, completedBooks);
  },

  async deleteReadingGoal(userId: string) {
    const readingGoal = await this.getReadingGoal(userId);
    if (!readingGoal)
      throw new AppError("Meta de leitura não encontrada", 404, "NOT_FOUND");

    return await readingGoalRepository.deleteReadingGoal(userId);
  },
};
