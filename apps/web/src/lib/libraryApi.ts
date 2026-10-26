import type {
  LibraryEntryCreateInput,
  LibraryEntryDetailsPublicResponse,
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

export async function getLibraryEntryDetails(
  id: string,
  signal?: AbortSignal,
): Promise<LibraryEntryDetailsPublicResponse> {
  const response = await api.get<LibraryEntryDetailsPublicResponse>(
    `/library/${encodeURIComponent(id)}`,
    { signal },
  );

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

export async function createLibraryNote(
  libraryId: string,
  content: string,
): Promise<void> {
  await api.post(`/library/${encodeURIComponent(libraryId)}/notes`, {
    content,
  });
}

export async function updateLibraryNote(
  noteId: string,
  content: string,
): Promise<void> {
  await api.patch(`/notes/${encodeURIComponent(noteId)}`, { content });
}

export async function deleteLibraryNote(noteId: string): Promise<void> {
  await api.delete(`/notes/${encodeURIComponent(noteId)}`);
}
