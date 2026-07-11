import type { UsageReportRow } from '../../../../application/ports/usage-report.port';
export type UsageRow = UsageReportRow;
export interface UsageReportApiDto {
  summary: { actual: string; allocated: string; possible: string };
  projects: UsageRow[];
  analysisRuns: UsageRow[];
  apiCalls: UsageRow[];
  allocations: UsageRow[];
  renders: UsageRow[];
  models: UsageRow[];
  nextCursor?: string | null;
}
