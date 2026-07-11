import type { GetUsageReportService } from '../../application/services/get-usage-report.service';
import { usageReportEntityToApi } from '../../converters/entity-api/usage-report.converter';
export class UsageReportController {
  constructor(private readonly service: GetUsageReportService) {}
  async handle(request: Request) {
    const url = new URL(request.url);
    const pageSize = Number(url.searchParams.get('pageSize') ?? 100);
    const cursor = url.searchParams.get('cursor');
    const report = await this.service.execute(
      cursor ? { cursor, pageSize } : { pageSize },
    );
    return Response.json(usageReportEntityToApi(report));
  }
}
