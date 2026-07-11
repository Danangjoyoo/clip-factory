import type { SourceValidationAcknowledgement } from '../dto/entity/worker-source-locator-entity.dto';

export type SourceValidationReceipt = {
  requestHash: string;
  response: SourceValidationAcknowledgement | null;
};

export interface SourceValidationReceiptPort {
  findByKey(key: string, tx?: unknown): Promise<SourceValidationReceipt | null>;
  createPending(key: string, requestHash: string, tx?: unknown): Promise<void>;
  complete(
    key: string,
    requestHash: string,
    response: SourceValidationAcknowledgement,
    tx?: unknown,
  ): Promise<SourceValidationAcknowledgement>;
}
