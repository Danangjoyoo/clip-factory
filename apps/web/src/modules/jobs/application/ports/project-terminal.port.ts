import type { ApplyWorkerResultResponse } from '../dto/entity';
import type { JobTransaction } from './unit-of-work.port';
export interface ProjectTerminalPort {
  applyWorkerResult(
    command: ApplyWorkerResultCommand,
    tx?: JobTransaction,
  ): Promise<ApplyWorkerResultResponse>;
}
export interface FreshReservationPort {
  authorizeFreshReservation(
    command: AuthorizeUncertainRetryCommand,
  ): Promise<void>;
}
export interface ApplyWorkerResultCommand extends ApplyWorkerResultResponse {
  idempotencyKey: string;
  requestHash: string;
}
export interface AuthorizeUncertainRetryCommand {
  workflowId: string;
  acknowledgePossiblePriorSpend: true;
}
