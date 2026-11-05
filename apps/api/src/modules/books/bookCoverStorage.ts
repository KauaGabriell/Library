import {
  BOOK_COVER_MAX_SIZE_BYTES,
  BOOK_COVER_MIME_TYPES,
} from "@library/contracts";
import { randomUUID } from "node:crypto";
import { createReadStream, type ReadStream } from "node:fs";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { AppError } from "../../errors/appError";

const imageTypes = {
  "image/jpeg": {
    extension: "jpg",
    contentType: "image/jpeg",
    matches: (file: Buffer) =>
      file.length >= 3 &&
      file[0] === 0xff &&
      file[1] === 0xd8 &&
      file[2] === 0xff,
  },
  "image/png": {
    extension: "png",
    contentType: "image/png",
    matches: (file: Buffer) =>
      file.length >= 8 &&
      file.subarray(0, 8).equals(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      ),
  },
  "image/webp": {
    extension: "webp",
    contentType: "image/webp",
    matches: (file: Buffer) =>
      file.length >= 12 &&
      file.toString("ascii", 0, 4) === "RIFF" &&
      file.toString("ascii", 8, 12) === "WEBP",
  },
} as const;

type BookCoverMimeType = (typeof BOOK_COVER_MIME_TYPES)[number];

export type StoredBookCover = {
  filename: string;
  url: string;
};

export type OpenedBookCover = {
  stream: ReadStream;
  contentType: string;
};

export type BookCoverStorage = {
  save(file: Buffer, mimeType: string): Promise<StoredBookCover>;
  remove(filename: string): Promise<void>;
  open(filename: string): Promise<OpenedBookCover | null>;
};

const bookCoverFilenamePattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|png|webp)$/i;
const publicCoverPathPrefix = "/books/covers/";

export function getStoredBookCoverFilename(
  coverUrl: string | null | undefined,
): string | null {
  if (!coverUrl?.startsWith(publicCoverPathPrefix)) return null;

  const filename = coverUrl.slice(publicCoverPathPrefix.length);
  return bookCoverFilenamePattern.test(filename) ? filename : null;
}

function isBookCoverMimeType(value: string): value is BookCoverMimeType {
  return Object.hasOwn(imageTypes, value);
}

export function createBookCoverStorage(directory: string): BookCoverStorage {
  function getPath(filename: string): string | null {
    return bookCoverFilenamePattern.test(filename)
      ? join(directory, filename)
      : null;
  }

  return {
    async save(file, mimeType) {
      if (file.byteLength > BOOK_COVER_MAX_SIZE_BYTES) {
        throw new AppError(
          "A capa deve ter no máximo 5 MB",
          413,
          "PAYLOAD_TOO_LARGE",
        );
      }

      if (!isBookCoverMimeType(mimeType)) {
        throw new AppError("Formato de imagem não permitido", 400, "VALIDATION_ERROR");
      }

      const imageType = imageTypes[mimeType];
      if (!imageType.matches(file)) {
        throw new AppError("O conteúdo da imagem não corresponde ao formato informado", 400, "VALIDATION_ERROR");
      }

      const filename = `${randomUUID()}.${imageType.extension}`;
      const path = getPath(filename);

      if (!path) {
        throw new Error("Generated book cover filename is invalid");
      }

      await mkdir(directory, { recursive: true });
      await writeFile(path, file, { flag: "wx" });

      return { filename, url: `/books/covers/${filename}` };
    },

    async remove(filename) {
      const path = getPath(filename);
      if (!path) return;
      await rm(path, { force: true });
    },

    async open(filename) {
      const path = getPath(filename);
      if (!path) return null;

      try {
        await stat(path);
      } catch (error) {
        if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
          return null;
        }

        throw error;
      }

      const extension = filename.slice(filename.lastIndexOf(".") + 1).toLowerCase();
      const contentType = Object.values(imageTypes).find(
        (imageType) => imageType.extension === extension,
      )?.contentType;

      if (!contentType) return null;
      return { stream: createReadStream(path), contentType };
    },
  };
}

const workingDirectory = process.cwd();
const apiRoot =
  basename(workingDirectory).toLowerCase() === "api" &&
  basename(dirname(workingDirectory)).toLowerCase() === "apps"
    ? workingDirectory
    : resolve(workingDirectory, "apps/api");

export const bookCoverStorage = createBookCoverStorage(
  join(apiRoot, "uploads/book-covers"),
);
