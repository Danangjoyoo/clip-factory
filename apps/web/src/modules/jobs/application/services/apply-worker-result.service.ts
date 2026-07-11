import type { ApplyWorkerResultCommand } from '../ports/project-terminal.port';
import type { UnitOfWork } from '../ports/unit-of-work.port';
import { IdempotencyReceiptDataService } from '../data-services/idempotency-receipt.data-service';
import { JobProjectionDataService } from '../data-services/job-projection.data-service';
import type {
  FreshReservationPort,
  ProjectTerminalPort,
} from '../ports/project-terminal.port';
export class IdempotencyConflictError extends Error {
  constructor(key: string) {
    super(`Idempotency key conflict: ${key}`);
    this.name = 'IdempotencyConflictError';
  }
}
export class PaidCallUncertainError extends Error {}
export class ApplyWorkerResultService {
  constructor(
    private readonly unitOfWork: UnitOfWork,
    private readonly receipts: IdempotencyReceiptDataService,
    private readonly jobs: JobProjectionDataService,
    private readonly projects: ProjectTerminalPort,
    private readonly reservations: FreshReservationPort = {
      authorizeFreshReservation: async () => undefined,
    },
  ) {}
  execute(command: ApplyWorkerResultCommand) {
    return this.unitOfWork.execute(async (tx) => {
      const receipt = await this.receipts.findByKey(command.idempotencyKey, tx);
      if (receipt) {
        if (receipt.requestHash !== command.requestHash)
          throw new IdempotencyConflictError(command.idempotencyKey);
        if (receipt.status === 'COMPLETED' && receipt.response)
          return receipt.response;
      } else
        await this.receipts.createPending(
          command.idempotencyKey,
          command.requestHash,
          tx,
        );
      const existing = await this.jobs.findByWorkflowId(command.workflowId, tx);
      if (
        existing?.terminalResult?.status === 'PAID_CALL_UNCERTAIN' &&
        !command.acknowledgePossiblePriorSpend
      )
        throw new PaidCallUncertainError(command.workflowId);
      if (
        existing?.terminalResult &&
        existing.terminalResult.status !== 'PAID_CALL_UNCERTAIN'
      )
        return this.receipts.complete(
          command.idempotencyKey,
          existing.terminalResult,
          tx,
        );
      const response = await this.projects.applyWorkerResult(command, tx);
      if (command.acknowledgePossiblePriorSpend)
        await this.reservations.authorizeFreshReservation(command);
      await this.jobs.recordResult(command.workflowId, response, tx);
      return this.receipts.complete(command.idempotencyKey, response, tx);
    });
  }
}
