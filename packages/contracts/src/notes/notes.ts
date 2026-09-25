import { z } from "zod";

export const noteSchema = z.object({
  content: z
    .string()
    .min(1)
    .max(10000)
    .regex(/\S/, "A nota não pode conter apenas espaços."),
});

export const publicNoteResponseSchema = z.object({
  id: z.uuid(),
  content: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type NoteInput = z.infer<typeof noteSchema>;
export type PublicNoteResponse = z.infer<typeof publicNoteResponseSchema>;
