import { describe, expect, it, vi } from "vitest";
import {
  createProviderCallContext,
  observeProviderCall,
} from "./providerTelemetry";

function createLogger() {
  return { info: vi.fn(), warn: vi.fn() };
}

describe("provider telemetry", () => {
  it.each([
    ["gemini", "generate_recommendations"],
    ["google_books", "search_books"],
  ] as const)("records successful %s calls", async (provider, operation) => {
    const logger = createLogger();
    const context = createProviderCallContext("request-123", logger);

    await expect(
      observeProviderCall(context, provider, operation, async () => "result"),
    ).resolves.toBe("result");

    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: "request-123",
        provider,
        operation,
        durationMs: expect.any(Number),
        result: "success",
      }),
      "External provider call completed",
    );
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it.each([
    ["gemini", "generate_recommendations"],
    ["google_books", "get_book_by_id"],
  ] as const)(
    "records failed %s calls without error details",
    async (provider, operation) => {
      const logger = createLogger();
      const context = createProviderCallContext("request-456", logger);
      const providerError = new Error("private provider response and secret");

      await expect(
        observeProviderCall(context, provider, operation, async () => {
          throw providerError;
        }),
      ).rejects.toBe(providerError);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: "request-456",
          provider,
          operation,
          durationMs: expect.any(Number),
          result: "failure",
        }),
        "External provider call failed",
      );
      expect(JSON.stringify(logger.warn.mock.calls)).not.toContain(
        providerError.message,
      );
      expect(logger.info).not.toHaveBeenCalled();
    },
  );
});
