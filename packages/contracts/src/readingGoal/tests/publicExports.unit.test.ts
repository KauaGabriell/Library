import {
  type ReadingGoalInput,
  type ReadingGoalResponse,
  readingGoalDeleteResponseSchema,
  readingGoalResponseSchema,
  readingGoalSchema,
} from "@library/contracts";
import { describe, expect, it } from "vitest";

describe("reading goal public exports", () => {
  it("exports input and response schemas through contracts entry point", () => {
    const input = {
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
    expect(readingGoalDeleteResponseSchema.parse(undefined)).toBeUndefined();
  });

  it.each([0, 1000])("rejects targetBooks %s", (targetBooks) => {
    expect(readingGoalSchema.safeParse({ targetBooks }).success).toBe(false);
  });

  it("rejects fractional progress percentages", () => {
    const response = {
      year: 2026,
      targetBooks: 12,
      completedBooks: 6,
      progressPercent: 50.5,
    };

    expect(readingGoalResponseSchema.safeParse(response).success).toBe(false);
  });
});
