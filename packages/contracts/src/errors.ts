import { z } from "zod";

export const errorsCodeList = [
  "VALIDATION_ERROR",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "CONFLICT",
  "INTEGRATION_ERROR",
  "INTERNAL_ERROR",
] as const;

export type ErrorCode = (typeof errorsCodeList)[number];

const errorsSchema = z.object({
  code: z.enum(errorsCodeList),
  message: z.string(),
  fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
});

export { errorsSchema };
