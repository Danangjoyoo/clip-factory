import type { HealthStatus } from '../dto/entity/health-entity.dto';
export type HealthCheck = {
  component: string;
  check(): Promise<{ status: HealthStatus; message?: string }>;
};
