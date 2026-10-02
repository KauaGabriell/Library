import {
  type PublicNoteResponse,
  publicNoteResponseSchema,
} from "@library/contracts";

type NoteForMapping = Omit<PublicNoteResponse, "createdAt" | "updatedAt"> & {
  createdAt: Date;
  updatedAt: Date;
};

export function mapNoteToPublicResponse(
  note: NoteForMapping,
): PublicNoteResponse {
  return publicNoteResponseSchema.parse({
    id: note.id,
    content: note.content,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  });
}
