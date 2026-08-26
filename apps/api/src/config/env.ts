import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  PORT: z.coerce.number().int().positive(),
  DATABASE_URL: z.url(),
  FRONTEND_URL: z.url(),
});

const envConfig = envSchema.parse(process.env);

export { envConfig };
