export interface IdempotencyReceiptRecordDto {
  id: string;
  key: string;
  scope: string;
  requestHash: string;
  status: string;
  responseJson: unknown | null;
}
