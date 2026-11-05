import { BOOK_COVER_MAX_SIZE_BYTES } from "@library/contracts";
import type { FastifyMultipartOptions } from "@fastify/multipart";

export const multipartConfig: FastifyMultipartOptions = {
  limits: {
    fileSize: BOOK_COVER_MAX_SIZE_BYTES,
    files: 1,
    fields: 1,
    parts: 2,
    fieldSize: 16 * 1024,
  },
};
