import {
  type ReadingGoalInput,
  type ReadingGoalResponse,
  readingGoalResponseSchema,
  readingGoalSchema,
} from "@library/contracts";
import { describe, expect, it } from "vitest";

describe("reading goal public exports", () => {
  it("exports input and response schemas through contracts entry point", () => {
    const input = {
      year: 2026,
      targetBooks: 12,
    } satisfies ReadingGoalInput;
    const response = {
      year: 2026,
      targetBooks: 12,
      completedBooks: 13,
      progressPercent: 100,
    } satisfies ReadingGoalResponse;

    expect(readingGoalSchema.parse(input)).toEqual(input);
    expect(readingGoalResponseSchema.parse(response)).toEqual(response);
  });

  it.each([0, 1000])("rejects targetBooks %s", (targetBooks) => {
    expect(readingGoalSchema.safeParse({ year: 2026, targetBooks }).success).toBe(
      false,
    );
  });
});
