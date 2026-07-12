const defaults = {
  DATABASE_URL:
    'postgresql://clip_factory:clip_factory_local_dev@127.0.0.1:5432/clip_factory',
  REDIS_URL: 'redis://127.0.0.1:6379/0',
  MINIO_ENDPOINT: 'http://127.0.0.1:9000',
  MINIO_PUBLIC_ENDPOINT: 'http://127.0.0.1:9000',
  MINIO_ACCESS_KEY: 'clip_factory_local',
  MINIO_SECRET_KEY: 'clip_factory_local_secret',
  TEMPORAL_ADDRESS: '127.0.0.1:7233',
  INTERNAL_SERVICE_TOKEN: 'clip_factory_worker_local_token',
} as const;

export function setIntegrationEnvDefaults() {
  if (process.env.RUN_INTEGRATION !== '1') return;
  for (const [key, value] of Object.entries(defaults)) {
    process.env[key] ??= value;
  }
}
