export interface UsageReportRow {
  id: string;
  [key: string]: unknown;
}

export interface UsageReport {
  summary: { actual: string; allocated: string; possible: string };
  projects: UsageReportRow[];
  analysisRuns: UsageReportRow[];
  apiCalls: UsageReportRow[];
  allocations: UsageReportRow[];
  renders: UsageReportRow[];
  models: UsageReportRow[];
  nextCursor?: string | null;
}

export interface UsageReportSource {
  report(input: { cursor?: string; pageSize: number }): Promise<UsageReport>;
}
