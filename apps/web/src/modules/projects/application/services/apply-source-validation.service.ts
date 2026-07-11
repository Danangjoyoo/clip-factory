import type { SourceAssetDataService } from '../data-services/source-asset.data-service';
import type {
  ApplySourceValidationCommand,
  SourceValidationAcknowledgement,
} from '../dto/entity/worker-source-locator-entity.dto';
import type { UnitOfWork } from '../ports/unit-of-work.port';
export type SourceValidationReceipt = { requestHash: string; response: SourceValidationAcknowledgement | null };
export type SourceValidationReceiptStore = { find(key: string): Promise<SourceValidationReceipt | null>; complete(key: string, hash: string, response: SourceValidationAcknowledgement): Promise<void> };
const memoryReceipts = new Map<string, SourceValidationReceipt>();
const fallbackReceipts: SourceValidationReceiptStore = {
  async find(key) { return memoryReceipts.get(key) ?? null; },
  async complete(key, requestHash, response) { memoryReceipts.set(key, { requestHash, response }); },
};
export class ApplySourceValidationService {
  private readonly uow: UnitOfWork;
  private readonly receipts: SourceValidationReceiptStore;
  constructor(uow: UnitOfWork, sources: SourceAssetDataService, receipts?: SourceValidationReceiptStore);
  constructor(sources: SourceAssetDataService, uow?: UnitOfWork, receipts?: SourceValidationReceiptStore);
  constructor(
    first: UnitOfWork | SourceAssetDataService,
    second?: UnitOfWork | SourceAssetDataService,
    receipts: SourceValidationReceiptStore = fallbackReceipts,
  ) {
    const firstIsSources = 'applyValidatedLocator' in first;
    this.sources = (firstIsSources ? first : second) as SourceAssetDataService;
    const uow = firstIsSources ? second : first;
    this.uow = (uow && 'execute' in uow ? uow : { execute: (fn) => fn(undefined) });
    this.receipts = receipts;
  }
  private readonly sources: SourceAssetDataService;
  async execute(
    command: ApplySourceValidationCommand,
  ): Promise<SourceValidationAcknowledgement> {
    if (!command.requestHash) throw new Error('request hash required');
    return this.uow.execute(async (tx) => {
      const prior = await this.receipts.find(command.idempotencyKey);
      if (prior) {
        if (prior.requestHash !== command.requestHash) throw new Error('idempotency conflict');
        if (prior.response) return prior.response;
      }
      const updated = await this.sources.applyValidatedLocator(command, tx);
      const response = { sourceAssetId: updated.id, health: updated.health, fingerprint: updated.fingerprint ?? command.fingerprint };
      await this.receipts.complete(command.idempotencyKey, command.requestHash, response);
      return response;
    });
  }
}
