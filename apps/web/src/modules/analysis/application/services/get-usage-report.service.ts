import type { UsageReportApiDto } from '../../delivery/http/dto/api/usage-report-api.dto';
export interface UsageReportSource { report(input: { cursor?: string; pageSize: number }): Promise<UsageReportApiDto>; }
export class GetUsageReportService { constructor(private readonly source: UsageReportSource) {} execute(input: { cursor?: string; pageSize?: number } = {}) { return this.source.report({ ...(input.cursor ? { cursor: input.cursor } : {}), pageSize: Math.min(100, Math.max(1, input.pageSize ?? 100)) }); } }
