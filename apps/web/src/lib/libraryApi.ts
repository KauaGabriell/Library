import type {
  LibraryEntryCreateInput,
  LibraryEntryListQuery,
  LibraryEntryListResponse,
  LibraryEntryPublicResponse,
  LibraryEntryUpdateInput,
} from "@library/contracts";
import { api } from "./api";

export async function getLibraryEntries(
  query: LibraryEntryListQuery,
  signal?: AbortSignal,
): Promise<LibraryEntryListResponse> {
  const response = await api.get<LibraryEntryListResponse>("/library", {
    params: query,
    signal,
  });

  return response.data;
}

export async function addLibraryEntry(
  input: LibraryEntryCreateInput,
): Promise<LibraryEntryPublicResponse> {
  const response = await api.post<LibraryEntryPublicResponse>(
    "/library",
    input,
  );
  return response.data;
}

export async function updateLibraryEntry(
  id: string,
  patch: LibraryEntryUpdateInput,
): Promise<LibraryEntryPublicResponse> {
  const response = await api.patch<LibraryEntryPublicResponse>(
    `/library/${encodeURIComponent(id)}`,
    patch,
  );
  return response.data;
}

export async function deleteLibraryEntry(id: string): Promise<void> {
  await api.delete(`/library/${encodeURIComponent(id)}`);
}
