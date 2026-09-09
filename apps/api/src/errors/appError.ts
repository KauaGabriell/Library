import type { ErrorCode } from "@library/contracts";

class AppError extends Error {
  statusCode: number;
  code: ErrorCode;

  constructor(message: string, statusCode: number, code: ErrorCode) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export { AppError };
