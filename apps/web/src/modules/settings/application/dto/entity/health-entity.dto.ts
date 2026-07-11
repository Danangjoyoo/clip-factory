export type HealthStatus = 'HEALTHY' | 'DEGRADED' | 'OFFLINE' | 'UNKNOWN';
export type HealthEntity = { status: HealthStatus; components: { component: string; status: HealthStatus; checkedAt: string; message?: string }[] };
