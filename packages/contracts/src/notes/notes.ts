import { z } from "zod";

const noteContentSchema = z
  .string()
  .min(1)
  .max(10000)
  .regex(/\S/, "A nota não pode conter apenas espaços.");

export const noteSchema = z.object({
  content: noteContentSchema,
});

export const noteParamsSchema = z.object({
  libraryId: z.uuid(),
});

export const updateAndDeleteNoteParamsSchema = z.object({
  noteId: z.uuid(),
});

export const publicNoteResponseSchema = z.object({
  id: z.uuid(),
  content: noteContentSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const noteDeleteResponseSchema = z
  .undefined()
  .describe("Nota removida; resposta sem corpo");

export type NoteInput = z.infer<typeof noteSchema>;
export type PublicNoteResponse = z.infer<typeof publicNoteResponseSchema>;
