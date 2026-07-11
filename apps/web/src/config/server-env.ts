import { z } from 'zod';

export const ServerEnvSchema = z
  .object({
    DATABASE_URL: z.string().min(1),
    REDIS_URL: z.string().min(1),
    MINIO_ENDPOINT: z.string().url(),
    MINIO_ACCESS_KEY: z.string().min(1),
    MINIO_SECRET_KEY: z.string().min(1),
    TEMPORAL_ADDRESS: z.string().min(1),
    INTERNAL_SERVICE_TOKEN: z.string().min(1),
  })
  .strict();
export function loadServerEnv() {
  const env = process.env;
  return ServerEnvSchema.parse({
    DATABASE_URL: env.DATABASE_URL,
    REDIS_URL: env.REDIS_URL,
    MINIO_ENDPOINT: env.MINIO_ENDPOINT,
    MINIO_ACCESS_KEY: env.MINIO_ACCESS_KEY,
    MINIO_SECRET_KEY: env.MINIO_SECRET_KEY,
    TEMPORAL_ADDRESS: env.TEMPORAL_ADDRESS,
    INTERNAL_SERVICE_TOKEN: env.INTERNAL_SERVICE_TOKEN,
  });
}
