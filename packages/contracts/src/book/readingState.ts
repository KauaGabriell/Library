import { z } from "zod";

export const readingStateSchema = z.enum(["WANT_TO_READ", "READING", "READ"]);

export type ReadingState = z.infer<typeof readingStateSchema>;
