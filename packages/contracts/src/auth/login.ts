import { z } from "zod";

export const loginRequestSchema = z.object({
  email: z.email("Credenciais inválidas"),
  password: z.string().min(12, "Credenciais inválidas"),
});

export type loginRequestInput = z.infer<typeof loginRequestSchema>;
