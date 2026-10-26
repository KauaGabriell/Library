import type {
  LibraryEntryCreateInput,
  LibraryEntryListQuery,
  LibraryEntryUpdateInput,
} from "@library/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addLibraryEntry,
  createLibraryNote,
  deleteLibraryEntry,
  deleteLibraryNote,
  getLibraryEntries,
  getLibraryEntryDetails,
  updateLibraryEntry,
  updateLibraryNote,
} from "../lib/libraryApi";

export const libraryQueryKeys = {
  all: ["library"] as const,
  list: (query: LibraryEntryListQuery) => ["library", "list", query] as const,
  detail: (id: string) => ["library", "detail", id] as const,
};

export function useLibraryEntries(
  query: LibraryEntryListQuery,
  enabled = true,
) {
  const hasValidSearch = !query.q || query.q.trim().length >= 2;

  return useQuery({
    queryKey: libraryQueryKeys.list(query),
    queryFn: ({ signal }) => getLibraryEntries(query, signal),
    enabled: enabled && hasValidSearch,
    retry: false,
  });
}

export function useLibraryEntryDetails(id: string) {
  return useQuery({
    queryKey: libraryQueryKeys.detail(id),
    queryFn: ({ signal }) => getLibraryEntryDetails(id, signal),
    enabled: Boolean(id),
    retry: false,
  });
}

function useInvalidateLibraryData() {
  const queryClient = useQueryClient();

  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: libraryQueryKeys.all }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
    ]);
  };
}

export function useAddLibraryEntry() {
  const invalidateLibraryData = useInvalidateLibraryData();

  return useMutation({
    mutationFn: (input: LibraryEntryCreateInput) => addLibraryEntry(input),
    onSuccess: invalidateLibraryData,
  });
}

export function useUpdateLibraryEntry() {
  const invalidateLibraryData = useInvalidateLibraryData();

  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: LibraryEntryUpdateInput;
    }) => updateLibraryEntry(id, patch),
    onSuccess: invalidateLibraryData,
  });
}

export function useDeleteLibraryEntry() {
  const invalidateLibraryData = useInvalidateLibraryData();

  return useMutation({
    mutationFn: (id: string) => deleteLibraryEntry(id),
    onSuccess: invalidateLibraryData,
  });
}

export function useCreateLibraryNote(libraryId: string) {
  const invalidateLibraryData = useInvalidateLibraryData();

  return useMutation({
    mutationFn: (content: string) => createLibraryNote(libraryId, content),
    onSuccess: invalidateLibraryData,
  });
}

export function useUpdateLibraryNote() {
  const invalidateLibraryData = useInvalidateLibraryData();

  return useMutation({
    mutationFn: ({ noteId, content }: { noteId: string; content: string }) =>
      updateLibraryNote(noteId, content),
    onSuccess: invalidateLibraryData,
  });
}

export function useDeleteLibraryNote() {
  const invalidateLibraryData = useInvalidateLibraryData();

  return useMutation({
    mutationFn: (noteId: string) => deleteLibraryNote(noteId),
    onSuccess: invalidateLibraryData,
  });
}
