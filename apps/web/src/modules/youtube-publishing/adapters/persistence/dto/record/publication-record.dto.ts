export type PublicationRecordVisibility = 'PRIVATE_REVIEW' | 'SCHEDULED';

export type PublicationRecordState =
  | 'READY_TO_UPLOAD'
  | 'UPLOADING'
  | 'UPLOAD_OUTCOME_UNCERTAIN'
  | 'YOUTUBE_PROCESSING'
  | 'PRIVATE_REVIEW'
  | 'SCHEDULED'
  | 'PUBLISHED'
  | 'FAILED'
  | 'CANCELLED';

export type PublicationRecordDto = {
  id: string;
  project_id: string;
  clip_id: string;
  render_id: string;
  connection_id: string;
  metadata_draft_id: string;
  workflow_id: string;
  intent_key: string;
  idempotency_key: string;
  metadata_snapshot: unknown;
  visibility: PublicationRecordVisibility;
  api_project_verified_snapshot: boolean;
  source_local_datetime: string | null;
  source_timezone: string | null;
  schedule_at_utc: Date | null;
  state: PublicationRecordState;
  youtube_video_id: string | null;
  youtube_url: string | null;
  remote_video_created_at: Date | null;
  thumbnail_warning_code: string | null;
  sanitized_error_code: string | null;
  sanitized_error_message: string | null;
  created_at: Date;
  updated_at: Date;
};
