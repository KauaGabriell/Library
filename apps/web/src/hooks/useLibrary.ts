import type {
  LibraryEntryCreateInput,
  LibraryEntryListQuery,
  LibraryEntryUpdateInput,
} from "@library/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addLibraryEntry,
  deleteLibraryEntry,
  getLibraryEntries,
  updateLibraryEntry,
} from "../lib/libraryApi";

export const libraryQueryKeys = {
  all: ["library"] as const,
  list: (query: LibraryEntryListQuery) => ["library", "list", query] as const,
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

function useInvalidateLibraryData() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: libraryQueryKeys.all });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
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
