import { afterEach, describe, expect, it, vi } from "vitest";
import { readingGoalRepository } from "../readingRepository";
import { readingGoalService } from "../readingGoalService";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("readingGoalService.getReadingGoal", () => {
  it("returns null when the user has no current-year goal", async () => {
    vi.spyOn(readingGoalRepository, "getUserReadingGoal").mockResolvedValue(
      null,
    );
    vi.spyOn(readingGoalRepository, "getReadBooks").mockResolvedValue(0);

    await expect(
      readingGoalService.getReadingGoal("user-id"),
    ).resolves.toBeNull();
  });
});
