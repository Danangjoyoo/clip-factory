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
export const analysisComposition = () => {
  const env = loadServerEnv();
  const uow = {
    execute: <T>(fn: (tx: unknown) => Promise<T>) =>
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
  return {
    usageCallbackController: new UsageCallbackController(
      service,
      env.INTERNAL_SERVICE_TOKEN,
    ),
  };
};
