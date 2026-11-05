import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createBookCoverStorage } from "../bookCoverStorage";

const signatures = {
  "image/png": Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01,
  ]),
  "image/jpeg": Buffer.from([0xff, 0xd8, 0xff, 0x01]),
  "image/webp": Buffer.from([
    0x52, 0x49, 0x46, 0x46, 0x04, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
  ]),
} as const;

let directory: string;

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "library-book-covers-"));
});

afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

describe("book cover storage", () => {
  it.each(Object.entries(signatures))(
    "stores %s with generated filename and serves the stored bytes",
    async (mimeType, file) => {
      const storage = createBookCoverStorage(directory);
      const saved = await storage.save(file, mimeType);

      expect(saved.filename).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$/,
      );
      expect(saved.url).toBe(`/books/covers/${saved.filename}`);

      const stored = await storage.open(saved.filename);
      expect(stored).not.toBeNull();
      expect(stored?.contentType).toBe(mimeType);
      const content = Buffer.concat(await stored!.stream.toArray());
      expect(content).toEqual(file);
    },
  );

  it("rejects unsupported types and mismatched file signatures", async () => {
    const storage = createBookCoverStorage(directory);

    await expect(storage.save(signatures["image/png"], "image/gif")).rejects.toThrow();
    await expect(storage.save(signatures["image/png"], "image/jpeg")).rejects.toThrow();
  });

  it("rejects files larger than the configured limit", async () => {
    const storage = createBookCoverStorage(directory);
    const oversized = Buffer.alloc(5 * 1024 * 1024 + 1);

    await expect(storage.save(oversized, "image/png")).rejects.toThrow();
  });

  it("does not open unsafe or missing filenames", async () => {
    const storage = createBookCoverStorage(directory);

    await expect(storage.open("../../secret.png")).resolves.toBeNull();
    await expect(
      storage.open("00000000-0000-4000-8000-000000000000.png"),
    ).resolves.toBeNull();
  });

  it("removes a saved file by its generated filename", async () => {
    const storage = createBookCoverStorage(directory);
    const saved = await storage.save(signatures["image/png"], "image/png");

    await storage.remove(saved.filename);

    await expect(storage.open(saved.filename)).resolves.toBeNull();
  });
});
