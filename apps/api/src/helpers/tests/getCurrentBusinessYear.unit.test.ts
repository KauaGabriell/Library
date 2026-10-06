import { afterEach, describe, expect, it, vi } from "vitest";
import { getCurrentBusinessYear } from "../getCurrencyYear";

afterEach(() => {
  vi.useRealTimers();
});

describe("getCurrentBusinessYear", () => {
  it("keeps previous year before midnight in São Paulo", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2027-01-01T02:59:59.000Z"));

    expect(getCurrentBusinessYear()).toBe(2026);
  });

  it("switches year at midnight in São Paulo", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2027-01-01T03:00:00.000Z"));

    expect(getCurrentBusinessYear()).toBe(2027);
  });
});
