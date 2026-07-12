export type PublicationAttemptRecordStage =
  | 'STARTING'
  | 'UPLOADING'
  | 'OUTCOME_UNCERTAIN'
  | 'RECONCILING'
  | 'POLLING'
  | 'THUMBNAIL'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type PublicationAttemptRecordDto = {
  id: string;
  publication_id: string;
  attempt_number: number;
  idempotency_key: string;
  resumable_session_reference: string | null;
  acknowledged_bytes: bigint;
  total_bytes: bigint;
  stage: PublicationAttemptRecordStage;
  progress_percent: number;
  final_chunk_dispatch_started_at: Date | null;
  outcome_uncertain_at: Date | null;
  reconciliation_checked_at: Date | null;
  reconciliation_result:
    | 'VIDEO_FOUND'
    | 'NO_MATCH_FOUND'
    | 'INCONCLUSIVE'
    | null;
  duplicate_risk_acknowledged_at: Date | null;
  sanitized_error_code: string | null;
  sanitized_error_message: string | null;
  started_at: Date;
  completed_at: Date | null;
  updated_at: Date;
};
