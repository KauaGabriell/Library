import { notFoundErrorSchema, validationErrorSchema } from "@library/contracts";
import { describe, expect, it } from "vitest";

describe("notFoundErrorSchema public export", () => {
  it("accepts the standard not-found error response", () => {
    const errorResponse = {
      code: "NOT_FOUND",
      message: "Leitura não encontrada",
    };

    expect(notFoundErrorSchema.parse(errorResponse)).toEqual(errorResponse);
  });
});

describe("validationErrorSchema", () => {
  it("accepts business validation errors without field-specific errors", () => {
    const errorResponse = {
      code: "VALIDATION_ERROR",
      message: "A página atual só pode ser alterada enquanto o livro está em leitura",
    };

    expect(validationErrorSchema.parse(errorResponse)).toEqual(errorResponse);
  });
});
