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

const baseErrorSchema = z.object({
  message: z.string(),
});

export const validationErrorSchema = baseErrorSchema.extend({
  code: z.literal("VALIDATION_ERROR"),
  fieldErrors: z.record(z.string(), z.array(z.string())),
});

export const conflictErrorSchema = baseErrorSchema.extend({
  code: z.literal("CONFLICT"),
});

export const unauthenticatedErrorSchema = baseErrorSchema.extend({
  code: z.literal("UNAUTHENTICATED"),
});

export { errorsSchema };
