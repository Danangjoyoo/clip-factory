import { LocalSettingsStoreAdapter } from '../adapters/filesystem/local-settings-store.adapter';
import { ZipDiagnosticsArchiveAdapter } from '../adapters/diagnostics/zip-diagnostics-archive.adapter';
import { GetHealthService } from '../application/services/get-health.service';
import { UpdateSettingsService } from '../application/services/update-settings.service';
import { ExportDiagnosticsService } from '../application/services/export-diagnostics.service';
import { SettingsController } from '../delivery/http/settings.controller';
import { loadServerEnv } from '../../../config/server-env';
import { postgresHealth } from '../adapters/health/postgres-health.adapter';
import { redisHealth } from '../adapters/health/redis-health.adapter';
import { minioHealth } from '../adapters/health/minio-health.adapter';
import { temporalHealth } from '../adapters/health/temporal-health.adapter';
import { workerHealth } from '../adapters/health/worker-health.adapter';

export function settingsComposition() {
  const store = new LocalSettingsStoreAdapter();
  const env = loadServerEnv();
  const health = new GetHealthService([
    postgresHealth('postgres', env.DATABASE_URL),
    redisHealth('redis', env.REDIS_URL),
    minioHealth('minio', env.MINIO_ENDPOINT),
    temporalHealth('temporal', env.TEMPORAL_ADDRESS),
    workerHealth(
      'worker',
      process.env.WORKER_VALIDATION_URL ?? 'http://127.0.0.1:8001',
    ),
  ]);
  return {
    controller: new SettingsController(
      store,
      new UpdateSettingsService(store),
      health,
      new ExportDiagnosticsService(new ZipDiagnosticsArchiveAdapter()),
    ),
  };
}
