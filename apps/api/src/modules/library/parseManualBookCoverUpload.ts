import {
  libraryEntryCreateSchema,
  type LibraryEntryCreateInput,
} from "@library/contracts";
import type { FastifyRequest } from "fastify";
import { AppError } from "../../errors/appError";
import { parseBookCoverMultipart } from "./parseBookCoverMultipart";

type ManualBookInput = Omit<
  Extract<LibraryEntryCreateInput, { source: "MANUAL" }>,
  "coverUrl"
>;

export type ManualBookCoverUpload = {
  input: ManualBookInput;
  file: Buffer;
  mimeType: string;
};

function throwInvalidUpload(message: string): never {
  throw new AppError(message, 400, "VALIDATION_ERROR");
}

export async function parseManualBookCoverUpload(
  request: FastifyRequest,
): Promise<ManualBookCoverUpload> {
  const { fields, cover } = await parseBookCoverMultipart(request, ["entry"]);
  const entryJson = fields.entry;

  if (!entryJson || !cover) {
    throwInvalidUpload("Informe os dados do livro e uma imagem de capa");
  }

  let parsedEntry: unknown;
  try {
    parsedEntry = JSON.parse(entryJson);
  } catch {
    throwInvalidUpload("Os dados do livro devem estar em JSON válido");
  }

  const entry = libraryEntryCreateSchema.parse(parsedEntry);
  if (entry.source !== "MANUAL") {
    throwInvalidUpload("O upload de capa só aceita cadastro manual");
  }

  if (entry.coverUrl !== undefined) {
    throwInvalidUpload("A capa deve ser enviada como arquivo");
  }

  const { coverUrl: _coverUrl, ...input } = entry;
  return { input, ...cover };
}
