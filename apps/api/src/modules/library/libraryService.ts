import type { ListLibraryParams } from "./libraryRepository";
import { libraryRepository } from "./libraryRepository";
export const libraryService = {
  async listLibrarys({ userId, page, pageSize, status }: ListLibraryParams) {
    const librarys = await libraryRepository.listLibrary({
      userId,
      page,
      pageSize,
      status,
    });
    return librarys;
  },
};
