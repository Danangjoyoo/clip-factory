export interface UsageRow { id: string; [key: string]: unknown }
export interface UsageReportApiDto {
  summary: { actual: string; allocated: string; possible: string };
  projects: UsageRow[]; analysisRuns: UsageRow[]; apiCalls: UsageRow[];
  allocations: UsageRow[]; renders: UsageRow[]; models: UsageRow[];
  nextCursor?: string | null;
}
