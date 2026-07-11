import { prisma } from '../../../infrastructure/prisma/client';
import { loadServerEnv } from '../../../config/server-env';
import { AIUsageEventDataService } from '../application/data-services/ai-usage-event.data-service';
import { AnalysisRunDataService } from '../application/data-services/analysis-run.data-service';
import { PaidCallReservationDataService } from '../application/data-services/paid-call-reservation.data-service';
import { RecordUsageService } from '../application/services/record-usage.service';
import { PrismaAIUsageEventRepository } from '../adapters/persistence/repositories/prisma-ai-usage-event.repository';
import { PrismaAnalysisRunRepository } from '../adapters/persistence/repositories/prisma-analysis-run.repository';
import { PrismaPaidCallReservationRepository } from '../adapters/persistence/repositories/prisma-paid-call-reservation.repository';
import { UsageCallbackController } from '../delivery/http/usage-callback.controller';
import type { AnalysisTransaction } from '../application/ports/unit-of-work.port';
import { ReconcileUncertainPaidCallService } from '../application/services/reconcile-uncertain-paid-call.service';
import { GetUsageReportService } from '../application/services/get-usage-report.service';
import { PrismaUsageReportRepository } from '../adapters/persistence/repositories/prisma-usage-report.repository';
import { UsageReportController } from '../delivery/http/usage-report.controller';
export const analysisComposition = () => {
  const env = loadServerEnv();
  const uow = {
    execute: <T>(fn: (tx: AnalysisTransaction) => Promise<T>) =>
      prisma.$transaction((tx) => fn(tx)),
  };
  const service = new RecordUsageService(
    uow,
    new AIUsageEventDataService(new PrismaAIUsageEventRepository()),
    new AnalysisRunDataService(new PrismaAnalysisRunRepository()),
    new PaidCallReservationDataService(
      new PrismaPaidCallReservationRepository(),
    ),
  );
  const usageReportService = new GetUsageReportService(new PrismaUsageReportRepository());
  return {
    usageReportService,
    reconcileUncertainPaidCallService: new ReconcileUncertainPaidCallService(
      service,
    ),
    usageCallbackController: new UsageCallbackController(
      service,
      env.INTERNAL_SERVICE_TOKEN,
    ),
    usageReportController: new UsageReportController(
      usageReportService,
    ),
  };
};
