import type {
  HealthEntity,
  HealthStatus,
} from '../dto/entity/health-entity.dto';
import type { HealthCheck } from '../ports/health-check.port';
export class GetHealthService {
  constructor(private readonly checks: readonly HealthCheck[]) {}
  async execute(): Promise<HealthEntity> {
    const components = await Promise.all(
      this.checks.map(async ({ component, check }) => {
        try {
          const result = await Promise.race([
            check(),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('timeout')), 2000),
            ),
          ]);
          return { component, ...result, checkedAt: new Date().toISOString() };
        } catch {
          return {
            component,
            status: 'DEGRADED' as HealthStatus,
            message: 'unavailable',
            checkedAt: new Date().toISOString(),
          };
        }
      }),
    );
    return {
      status: components.every((c) => c.status === 'HEALTHY')
        ? 'HEALTHY'
        : 'DEGRADED',
      components,
    };
  }
}
