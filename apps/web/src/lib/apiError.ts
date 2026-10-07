import { type ErrorCode, errorsSchema } from "@library/contracts";
import { AxiosError } from "axios";

export class ApiClientError extends Error {
  readonly statusCode?: number;
  readonly code?: ErrorCode;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(
    message: string,
    details: {
      statusCode?: number;
      code?: ErrorCode;
      fieldErrors?: Record<string, string[]>;
    } = {},
  ) {
    super(message);
    this.name = "ApiClientError";
    this.statusCode = details.statusCode;
    this.code = details.code;
    this.fieldErrors = details.fieldErrors;
  }
}

export function parseApiError(error: unknown): ApiClientError {
  if (error instanceof AxiosError) {
    const statusCode = error.response?.status;
    const parsedResponse = errorsSchema.safeParse(error.response?.data);

    if (parsedResponse.success) {
      return new ApiClientError(
        parsedResponse.data.message,
        {
          statusCode,
          code: parsedResponse.data.code,
          fieldErrors: parsedResponse.data.fieldErrors,
        },
      );
    }

    return new ApiClientError("Erro ao concluir a operação", { statusCode });
  }

  return new ApiClientError("Erro ao concluir a operação");
}
