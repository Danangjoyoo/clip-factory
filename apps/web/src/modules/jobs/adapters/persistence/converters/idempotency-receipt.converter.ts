import type { IdempotencyReceiptEntityDto } from '../../../application/dto/entity';
import type { IdempotencyReceiptRecordDto } from '../dto/record/idempotency-receipt-record.dto';
export const idempotencyReceiptRecordToEntity = (
  r: IdempotencyReceiptRecordDto,
): IdempotencyReceiptEntityDto => ({
  key: r.key,
  requestHash: r.requestHash,
  status: r.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING',
  response: r.responseJson as IdempotencyReceiptEntityDto['response'],
});
