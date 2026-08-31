import { z } from "zod";

export const registerRequestSchema = z.object({
  email: z.email(),
  password: z.string().min(12, "Senha deve conter no minímo 12 caracteres"),
  name: z.string().optional(),
});

export const publicUserSchema = z.object({
  id: z.uuid(),
  email: z.email({ message: "E-mail inválido" }),
  name: z.string().nullable(),
  avatarUrl: z.url().nullable(),
});

export type RegisterRequestInput = z.infer<typeof registerRequestSchema>;
export type PublicUser = z.infer<typeof publicUserSchema>;
