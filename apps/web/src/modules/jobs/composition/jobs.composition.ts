import { prisma } from '../../../infrastructure/prisma/client';
import { loadServerEnv } from '../../../config/server-env';
import { ApplyWorkerResultService } from '../application/services/apply-worker-result.service';
import { IdempotencyReceiptDataService } from '../application/data-services/idempotency-receipt.data-service';
import { JobProjectionDataService } from '../application/data-services/job-projection.data-service';
import { PrismaIdempotencyReceiptRepository } from '../adapters/persistence/repositories/prisma-idempotency-receipt.repository';
import { PrismaJobProjectionRepository } from '../adapters/persistence/repositories/prisma-job-projection.repository';
import { WorkerResultController } from '../delivery/http/worker-result.controller';
import type { UnitOfWork } from '../application/ports/unit-of-work.port';
import type { FreshReservationPort } from '../application/ports/project-terminal.port';
export function jobsComposition() {
  const env = loadServerEnv();
  const uow: UnitOfWork = {
    execute: (fn) => prisma.$transaction((tx) => fn(tx)),
  };
  // Task 14 must replace this adapter with the real reservation workflow.
  const freshReservation: FreshReservationPort = {
    authorizeFreshReservation: async () => {
      throw new Error('FRESH_RESERVATION_NOT_CONFIGURED');
    },
  };
  const service = new ApplyWorkerResultService(
    uow,
    new IdempotencyReceiptDataService(new PrismaIdempotencyReceiptRepository()),
    new JobProjectionDataService(new PrismaJobProjectionRepository()),
    {
      applyWorkerResult: async (command) => ({
        workflowId: command.workflowId,
        projectId: command.projectId,
        status: command.status,
        completedAt: command.completedAt,
      }),
    },
    freshReservation,
  );
  return {
    workerResultController: new WorkerResultController(
      service,
      env.INTERNAL_SERVICE_TOKEN,
    ),
  };
}
