import type { SourceAssetDataService } from '../data-services/source-asset.data-service';
import type {
  ApplySourceValidationCommand,
  SourceValidationAcknowledgement,
} from '../dto/entity/worker-source-locator-entity.dto';
import type { UnitOfWork } from '../ports/unit-of-work.port';
import type { SourceValidationReceiptPort } from '../ports/source-validation-receipt.port';
export class SourceValidationInProgressError extends Error {}
export class ApplySourceValidationService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly sources: SourceAssetDataService,
    private readonly receipts: SourceValidationReceiptPort,
  ) {}
  async execute(
    command: ApplySourceValidationCommand,
  ): Promise<SourceValidationAcknowledgement> {
    if (!command.requestHash) throw new Error('request hash required');
    return this.uow.execute(async (tx) => {
      const prior = await this.receipts.findByKey(command.idempotencyKey, tx);
      if (prior) {
        if (prior.requestHash !== command.requestHash)
          throw new Error('idempotency conflict');
        if (prior.response) return prior.response;
        throw new SourceValidationInProgressError(command.idempotencyKey);
      }
      await this.receipts.createPending(
        command.idempotencyKey,
        command.requestHash,
        tx,
      );
      const updated = await this.sources.applyValidatedLocator(command, tx);
      const response = {
        sourceAssetId: updated.id,
        health: updated.health,
        fingerprint: updated.fingerprint ?? command.fingerprint,
      };
      await this.receipts.complete(
        command.idempotencyKey,
        command.requestHash,
        response,
        tx,
      );
      return response;
    });
  }
}
