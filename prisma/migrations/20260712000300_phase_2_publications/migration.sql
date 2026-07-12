create table "publications" (
  "id" uuid primary key,
  "project_id" uuid not null references "projects" ("id") on delete cascade,
  "clip_id" uuid not null references "clips" ("id") on delete restrict,
  "render_id" uuid not null references "renders" ("id") on delete restrict,
  "connection_id" uuid not null references "youtube_connections" ("id") on delete restrict,
  "metadata_draft_id" uuid not null references "publishing_metadata_drafts" ("id") on delete restrict,
  "workflow_id" text not null,
  "intent_key" text not null,
  "idempotency_key" text not null,
  "metadata_snapshot" jsonb not null,
  "visibility" text not null,
  "api_project_verified_snapshot" boolean not null,
  "source_local_datetime" text,
  "source_timezone" text,
  "schedule_at_utc" timestamptz,
  "state" text not null,
  "youtube_video_id" text,
  "youtube_url" text,
  "remote_video_created_at" timestamptz,
  "thumbnail_warning_code" text,
  "sanitized_error_code" text,
  "sanitized_error_message" text,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now(),
  constraint "publications_metadata_snapshot_check" check (jsonb_typeof("metadata_snapshot") = 'object'),
  constraint "publications_visibility_check" check ("visibility" in ('PRIVATE_REVIEW', 'SCHEDULED')),
  constraint "publications_state_check" check (
    "state" in ('READY_TO_UPLOAD', 'UPLOADING', 'UPLOAD_OUTCOME_UNCERTAIN',
                'YOUTUBE_PROCESSING', 'PRIVATE_REVIEW', 'SCHEDULED', 'PUBLISHED',
                'FAILED', 'CANCELLED')
  ),
  constraint "publications_schedule_check" check (
    ("visibility" = 'PRIVATE_REVIEW' and "source_local_datetime" is null and
      "source_timezone" is null and "schedule_at_utc" is null) or
    ("visibility" = 'SCHEDULED' and "api_project_verified_snapshot" and
      "source_local_datetime" is not null and "source_timezone" is not null and
      "schedule_at_utc" is not null)
  ),
  constraint "publications_remote_identity_check" check (
    ("youtube_video_id" is null and "youtube_url" is null and "remote_video_created_at" is null) or
    ("youtube_video_id" is not null and "youtube_url" is not null and "remote_video_created_at" is not null)
  )
);

create unique index "publications_connection_intent_key"
  on "publications" ("connection_id", "intent_key");
create unique index "publications_idempotency_key"
  on "publications" ("idempotency_key");
create unique index "publications_workflow_id_key"
  on "publications" ("workflow_id");
create unique index "publications_youtube_video_id_key"
  on "publications" ("youtube_video_id") where "youtube_video_id" is not null;
create index "publications_project_created_idx"
  on "publications" ("project_id", "created_at" desc);
create index "publications_schedule_state_idx"
  on "publications" ("state", "schedule_at_utc") where "schedule_at_utc" is not null;

create table "publication_attempts" (
  "id" uuid primary key,
  "publication_id" uuid not null references "publications" ("id") on delete cascade,
  "attempt_number" integer not null,
  "idempotency_key" text not null,
  "resumable_session_reference" text,
  "acknowledged_bytes" bigint not null default 0,
  "total_bytes" bigint not null,
  "stage" text not null,
  "progress_percent" integer not null default 0,
  "final_chunk_dispatch_started_at" timestamptz,
  "outcome_uncertain_at" timestamptz,
  "reconciliation_checked_at" timestamptz,
  "reconciliation_result" text,
  "duplicate_risk_acknowledged_at" timestamptz,
  "sanitized_error_code" text,
  "sanitized_error_message" text,
  "started_at" timestamptz not null default now(),
  "completed_at" timestamptz,
  "updated_at" timestamptz not null default now(),
  constraint "publication_attempts_number_check" check ("attempt_number" > 0),
  constraint "publication_attempts_bytes_check" check (
    "total_bytes" > 0 and "acknowledged_bytes" >= 0 and "acknowledged_bytes" <= "total_bytes"
  ),
  constraint "publication_attempts_progress_check" check ("progress_percent" between 0 and 100),
  constraint "publication_attempts_reconciliation_result_check" check (
    "reconciliation_result" is null or
    "reconciliation_result" in ('VIDEO_FOUND', 'NO_MATCH_FOUND', 'INCONCLUSIVE')
  ),
  constraint "publication_attempts_uncertainty_audit_check" check (
    ("outcome_uncertain_at" is null and "reconciliation_checked_at" is null and
      "reconciliation_result" is null and "duplicate_risk_acknowledged_at" is null) or
    ("final_chunk_dispatch_started_at" is not null and "outcome_uncertain_at" is not null and
      (("reconciliation_checked_at" is null and "reconciliation_result" is null and
        "duplicate_risk_acknowledged_at" is null) or
       ("reconciliation_checked_at" is not null and "reconciliation_result" is not null and
        ("duplicate_risk_acknowledged_at" is null or
         "duplicate_risk_acknowledged_at" >= "reconciliation_checked_at")))
    )
  ),
  constraint "publication_attempts_stage_check" check (
    "stage" in ('STARTING', 'UPLOADING', 'OUTCOME_UNCERTAIN', 'RECONCILING',
                'POLLING', 'THUMBNAIL', 'COMPLETED', 'FAILED', 'CANCELLED')
  )
);

create unique index "publication_attempts_publication_number_key"
  on "publication_attempts" ("publication_id", "attempt_number");
create unique index "publication_attempts_idempotency_key"
  on "publication_attempts" ("idempotency_key");
create index "publication_attempts_publication_started_idx"
  on "publication_attempts" ("publication_id", "started_at" desc);
