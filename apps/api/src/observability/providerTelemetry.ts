import { performance } from "node:perf_hooks";
import type { FastifyBaseLogger } from "fastify";

export type ExternalProvider = "gemini" | "google_books";

export type ProviderOperation =
  | "generate_recommendations"
  | "search_books"
  | "get_book_by_id";

export type ProviderCallEvent = {
  requestId: string;
  provider: ExternalProvider;
  operation: ProviderOperation;
  durationMs: number;
  result: "success" | "failure";
};

type ProviderCallEventPayload = Omit<ProviderCallEvent, "requestId">;

export type ProviderCallContext = {
  requestId: string;
  recordProviderEvent: (event: ProviderCallEventPayload) => void;
};

type ProviderEventLogger = Pick<FastifyBaseLogger, "info" | "warn">;

export function createProviderCallContext(
  requestId: string,
  logger: ProviderEventLogger,
): ProviderCallContext {
  return {
    requestId,
    recordProviderEvent(event) {
      const fields = { requestId, ...event };
      if (event.result === "failure") {
        logger.warn(fields, "External provider call failed");
        return;
      }

      logger.info(fields, "External provider call completed");
    },
  };
}

export async function observeProviderCall<T>(
  context: ProviderCallContext | undefined,
  provider: ExternalProvider,
  operation: ProviderOperation,
  call: () => Promise<T>,
): Promise<T> {
  if (!context) return call();

  const startedAt = performance.now();
  try {
    const result = await call();
    context.recordProviderEvent({
      provider,
      operation,
      durationMs: Math.round(performance.now() - startedAt),
      result: "success",
    });
    return result;
  } catch (error) {
    context.recordProviderEvent({
      provider,
      operation,
      durationMs: Math.round(performance.now() - startedAt),
      result: "failure",
    });
    throw error;
  }
}
