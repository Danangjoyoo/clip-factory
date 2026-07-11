import type { UsageReportSource } from '../ports/usage-report.port';
export class GetUsageReportService {
  constructor(private readonly source: UsageReportSource) {}
  execute(input: { cursor?: string; pageSize?: number } = {}) {
    return this.source.report({
      ...(input.cursor ? { cursor: input.cursor } : {}),
      pageSize: Math.min(100, Math.max(1, input.pageSize ?? 100)),
    });
  }
}
