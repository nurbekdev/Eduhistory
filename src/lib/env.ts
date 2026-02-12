import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_NAME: z.string().default("Eduhistory"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1),
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(16),
  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  MAX_UPLOAD_MB: z.coerce.number().positive().default(50),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().positive().default(60_000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().positive().default(120),
});

export const env = envSchema.parse(process.env);
