import type { FastifyRequest } from "fastify";
import { AppError } from "../../errors/appError";

type BookCoverMultipart = {
  fields: Record<string, string>;
  cover?: { file: Buffer; mimeType: string };
};

function isPayloadLimitError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    error.statusCode === 413
  );
}

function payloadLimitMessage(error: unknown): string {
  return typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "FST_REQ_FILE_TOO_LARGE"
    ? "A capa deve ter no máximo 5 MB"
    : "A requisição excede os limites de upload";
}

export async function parseBookCoverMultipart(
  request: FastifyRequest,
  allowedTextFields: readonly string[] = [],
): Promise<BookCoverMultipart> {
  if (!request.isMultipart()) {
    throw new AppError(
      "Envie os dados como multipart/form-data",
      400,
      "VALIDATION_ERROR",
    );
  }

  let cover: BookCoverMultipart["cover"];
  let invalidPart = false;
  const fields: Record<string, string> = {};

  try {
    for await (const part of request.parts()) {
      if (
        part.type === "field" &&
        allowedTextFields.includes(part.fieldname) &&
        typeof part.value === "string" &&
        fields[part.fieldname] === undefined
      ) {
        fields[part.fieldname] = part.value;
        continue;
      }

      if (part.type === "file" && part.fieldname === "cover" && !cover) {
        cover = { file: await part.toBuffer(), mimeType: part.mimetype };
        continue;
      }

      if (part.type === "file") part.file.resume();
      invalidPart = true;
    }
  } catch (error) {
    if (isPayloadLimitError(error)) {
      throw new AppError(
        payloadLimitMessage(error),
        413,
        "PAYLOAD_TOO_LARGE",
      );
    }

    throw error;
  }

  if (invalidPart) {
    throw new AppError(
      "Envie somente os campos permitidos e uma imagem de capa",
      400,
      "VALIDATION_ERROR",
    );
  }

  return cover ? { fields, cover } : { fields };
}
