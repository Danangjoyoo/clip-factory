import type { UsageReport } from '../../application/ports/usage-report.port';
import type { UsageReportApiDto } from '../../delivery/http/dto/api/usage-report-api.dto';
export const usageReportEntityToApi = (
  report: UsageReport,
): UsageReportApiDto => structuredClone(report);
