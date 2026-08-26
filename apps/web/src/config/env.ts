import { z } from "zod";

const envSchema = z.object({
  VITE_API_URL: z.url(),
});

const envConfig = envSchema.parse(import.meta.env);

export { envConfig };
