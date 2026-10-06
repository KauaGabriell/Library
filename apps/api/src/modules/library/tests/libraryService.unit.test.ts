import { beforeEach, describe, expect, it, vi } from "vitest";

const repositoryMock = vi.hoisted(() => ({
  listLibrary: vi.fn(),
  findById: vi.fn(),
  updateLibrary: vi.fn(),
}));

vi.mock("../libraryRepository", () => ({
  libraryRepository: repositoryMock,
}));

import { libraryService } from "../libraryService";

const existingEntry = {
  id: "entry-1",
  status: "READING" as const,
  currentPage: 0,
  rating: null,
  review: null,
  book: { pageCount: 250 },
};
const completedEntry = {
  ...existingEntry,
  status: "READ" as const,
  rating: 4,
  review: "Boa leitura",
};

const updateParams = {
  userId: "user-1",
  libraryId: existingEntry.id,
};

describe("libraryService.updateLibrary current page validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repositoryMock.findById.mockResolvedValue(existingEntry);
    repositoryMock.updateLibrary.mockResolvedValue(existingEntry);
  });

  it("accepts the last page when it equals the book page count", async () => {
    await expect(
      libraryService.updateLibrary({
        ...updateParams,
        patch: { currentPage: 250 },
      }),
    ).resolves.toBe(existingEntry);

    expect(repositoryMock.updateLibrary).toHaveBeenCalledWith({
      ...updateParams,
      patch: { currentPage: 250 },
    });
  });

  it("rejects a current page greater than the book page count", async () => {
    await expect(
      libraryService.updateLibrary({
        ...updateParams,
        patch: { currentPage: 251 },
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "VALIDATION_ERROR",
      message: "A página atual não pode ultrapassar o total de páginas do livro",
    });

    expect(repositoryMock.updateLibrary).not.toHaveBeenCalled();
  });
});

describe("libraryService.updateLibrary evaluation validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repositoryMock.findById.mockResolvedValue(existingEntry);
    repositoryMock.updateLibrary.mockResolvedValue(existingEntry);
  });

  it("accepts rating when the patch changes the resulting status to READ", async () => {
    const patch = { status: "READ" as const, rating: 5 };

    await expect(
      libraryService.updateLibrary({ ...updateParams, patch }),
    ).resolves.toBe(existingEntry);

    expect(repositoryMock.updateLibrary).toHaveBeenCalledWith({
      ...updateParams,
      patch,
    });
  });

  it("accepts a review update when the current status is already READ", async () => {
    repositoryMock.findById.mockResolvedValue(completedEntry);
    const patch = { review: "Gostei do final" };

    await expect(
      libraryService.updateLibrary({ ...updateParams, patch }),
    ).resolves.toBe(existingEntry);

    expect(repositoryMock.updateLibrary).toHaveBeenCalledWith({
      ...updateParams,
      patch,
    });
  });

  it("accepts a rating update when the current status is already READ", async () => {
    repositoryMock.findById.mockResolvedValue(completedEntry);
    const patch = { rating: 5 };

    await expect(
      libraryService.updateLibrary({ ...updateParams, patch }),
    ).resolves.toBe(existingEntry);

    expect(repositoryMock.updateLibrary).toHaveBeenCalledWith({
      ...updateParams,
      patch,
    });
  });

  it("accepts clearing a review when the current status is already READ", async () => {
    repositoryMock.findById.mockResolvedValue(completedEntry);
    const patch = { review: null };

    await expect(
      libraryService.updateLibrary({ ...updateParams, patch }),
    ).resolves.toBe(existingEntry);

    expect(repositoryMock.updateLibrary).toHaveBeenCalledWith({
      ...updateParams,
      patch,
    });
  });

  it.each([
    { description: "rating", patch: { rating: 5 } },
    { description: "review text", patch: { review: "Ainda estou lendo" } },
    { description: "clearing review", patch: { review: null } },
  ])(
    "rejects $description unless resulting status is READ",
    async ({
      patch,
    }: {
      description: string;
      patch: Parameters<typeof libraryService.updateLibrary>[0]["patch"];
    }) => {
      await expect(
        libraryService.updateLibrary({ ...updateParams, patch }),
      ).rejects.toMatchObject({
        statusCode: 400,
        code: "VALIDATION_ERROR",
        message:
          "Avaliação e resenha só podem ser alteradas quando o livro estiver marcado como lido",
      });

      expect(repositoryMock.updateLibrary).not.toHaveBeenCalled();
    },
  );

  it("allows changing status away from READ without changing its evaluation", async () => {
    repositoryMock.findById.mockResolvedValue(completedEntry);
    const patch = { status: "READING" as const };

    await expect(
      libraryService.updateLibrary({ ...updateParams, patch }),
    ).resolves.toBe(existingEntry);

    expect(repositoryMock.updateLibrary).toHaveBeenCalledWith({
      ...updateParams,
      patch,
    });
  });
});
