import type { UsageReportApiDto } from '../../delivery/http/dto/api/usage-report-api.dto';
export const usageReportEntityToApi = (report: UsageReportApiDto): UsageReportApiDto => structuredClone(report);
