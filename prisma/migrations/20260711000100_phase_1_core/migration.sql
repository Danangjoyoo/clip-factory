-- CreateEnum
CREATE TYPE "ProjectModeRecord" AS ENUM ('AI_HIGHLIGHTS', 'MANUAL');

-- CreateEnum
CREATE TYPE "ProjectStatusRecord" AS ENUM ('DRAFT', 'VALIDATING_SOURCE', 'UPLOADING', 'QUEUED', 'PREPROCESSING', 'TRANSCRIBING', 'VERIFYING_BUDGET', 'AWAITING_BUDGET', 'ANALYZING', 'PAID_CALL_UNCERTAIN', 'GENERATING_PREVIEWS', 'AWAITING_REVIEW', 'RENDERING', 'COMPLETED', 'FAILED', 'CANCELLED', 'SOURCE_MISSING', 'SOURCE_CHANGED', 'SOURCE_NOT_ALLOWED', 'RELINKING_SOURCE');

-- CreateEnum
CREATE TYPE "SourceKindRecord" AS ENUM ('LOCAL_FILE', 'BROWSER_UPLOAD');

-- CreateEnum
CREATE TYPE "SourceHealthRecord" AS ENUM ('UNKNOWN', 'LOCATED', 'HEALTHY', 'MISSING', 'CHANGED', 'NOT_ALLOWED', 'INVALID');

-- CreateEnum
CREATE TYPE "AnalysisStatusRecord" AS ENUM ('PLANNED', 'VERIFYING_BUDGET', 'AWAITING_BUDGET', 'RUNNING', 'PAID_CALL_UNCERTAIN', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ClipOriginRecord" AS ENUM ('AI_HIGHLIGHT', 'MANUAL');

-- CreateEnum
CREATE TYPE "ClipStateRecord" AS ENUM ('CANDIDATE', 'ACCEPTED', 'REJECTED', 'PREVIEW_READY', 'RENDERING', 'RENDERED', 'FAILED');

-- CreateEnum
CREATE TYPE "RenderStatusRecord" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "JobStatusRecord" AS ENUM ('QUEUED', 'RUNNING', 'WAITING', 'COMPLETED', 'FAILED', 'CANCELLED', 'WORKER_OFFLINE');

-- CreateEnum
CREATE TYPE "UploadStatusRecord" AS ENUM ('CREATED', 'UPLOADING', 'COMPLETED', 'ABORTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PaidCallStatusRecord" AS ENUM ('RESERVED', 'SENT', 'COMPLETED', 'UNCERTAIN', 'ABANDONED');

-- CreateEnum
CREATE TYPE "AllocationMethodRecord" AS ENUM ('EQUAL_SHARE');

-- CreateEnum
CREATE TYPE "ReasoningRecord" AS ENUM ('NONE', 'LOW', 'MEDIUM', 'HIGH', 'XHIGH', 'MAX');

-- CreateEnum
CREATE TYPE "PlatformPresetRecord" AS ENUM ('YOUTUBE_SHORTS', 'INSTAGRAM_REELS', 'TIKTOK');

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(200) NOT NULL,
    "mode" "ProjectModeRecord" NOT NULL,
    "language_tag" VARCHAR(35) NOT NULL,
    "default_max_clip_seconds" INTEGER NOT NULL,
    "default_platform_preset" "PlatformPresetRecord" NOT NULL,
    "status" "ProjectStatusRecord" NOT NULL DEFAULT 'DRAFT',
    "active_workflow_id" UUID,
    "openai_spend_microusd" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_assets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "kind" "SourceKindRecord" NOT NULL,
    "display_path" TEXT NOT NULL,
    "resolved_path" TEXT,
    "object_key" TEXT,
    "object_version_id" TEXT,
    "object_sha256" CHAR(64),
    "size_bytes" BIGINT,
    "modified_at" TIMESTAMPTZ(3),
    "fingerprint" VARCHAR(128),
    "probe_json" JSONB,
    "health" "SourceHealthRecord" NOT NULL DEFAULT 'UNKNOWN',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "source_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transcripts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "source_asset_id" UUID NOT NULL,
    "backend" VARCHAR(100) NOT NULL,
    "model" VARCHAR(200) NOT NULL,
    "model_revision" VARCHAR(200) NOT NULL,
    "weights_sha256" CHAR(64),
    "language_tag" VARCHAR(35) NOT NULL,
    "object_bucket" VARCHAR(63) NOT NULL DEFAULT 'clip-factory',
    "object_key" TEXT NOT NULL,
    "object_version_id" TEXT,
    "object_sha256" CHAR(64) NOT NULL,
    "duration_ms" INTEGER NOT NULL,
    "word_count" INTEGER NOT NULL,
    "runtime_ms" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transcripts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_runs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "model_id" VARCHAR(200) NOT NULL,
    "reasoning" "ReasoningRecord" NOT NULL,
    "prompt_version" VARCHAR(100) NOT NULL,
    "schema_version" VARCHAR(30) NOT NULL,
    "pricing_version" VARCHAR(100) NOT NULL,
    "budget_microusd" BIGINT NOT NULL,
    "safety_numerator" INTEGER NOT NULL DEFAULT 3,
    "safety_denominator" INTEGER NOT NULL DEFAULT 2,
    "coverage_start_ms" INTEGER NOT NULL,
    "coverage_end_ms" INTEGER NOT NULL,
    "estimated_max_microusd" BIGINT NOT NULL,
    "actual_microusd" BIGINT NOT NULL DEFAULT 0,
    "uncertain_call_count" INTEGER NOT NULL DEFAULT 0,
    "uncertain_reserved_microusd" BIGINT NOT NULL DEFAULT 0,
    "status" "AnalysisStatusRecord" NOT NULL DEFAULT 'PLANNED',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "analysis_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usage_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "analysis_run_id" UUID NOT NULL,
    "clip_id" UUID,
    "provider_response_id" VARCHAR(200) NOT NULL,
    "request_hash" CHAR(64) NOT NULL,
    "purpose" VARCHAR(100) NOT NULL,
    "model_id" VARCHAR(200) NOT NULL,
    "reasoning" "ReasoningRecord" NOT NULL,
    "prompt_version" VARCHAR(100) NOT NULL,
    "schema_version" VARCHAR(30) NOT NULL,
    "pricing_version" VARCHAR(100) NOT NULL,
    "input_tokens" INTEGER NOT NULL,
    "cached_input_tokens" INTEGER NOT NULL,
    "cache_write_input_tokens" INTEGER NOT NULL,
    "output_tokens" INTEGER NOT NULL,
    "reasoning_tokens" INTEGER NOT NULL,
    "pricing_tier" VARCHAR(50) NOT NULL,
    "cost_microusd" BIGINT NOT NULL,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paid_call_reservations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "analysis_run_id" UUID NOT NULL,
    "call_id" UUID NOT NULL,
    "request_hash" CHAR(64) NOT NULL,
    "worst_case_microusd" BIGINT NOT NULL,
    "status" "PaidCallStatusRecord" NOT NULL DEFAULT 'RESERVED',
    "provider_response_id" VARCHAR(200),
    "response_object_key" TEXT,
    "usage_event_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMPTZ(3),
    "completed_at" TIMESTAMPTZ(3),

    CONSTRAINT "paid_call_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_allocations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "analysis_run_id" UUID NOT NULL,
    "clip_id" UUID NOT NULL,
    "method" "AllocationMethodRecord" NOT NULL DEFAULT 'EQUAL_SHARE',
    "amount_microusd" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cost_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clips" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "analysis_run_id" UUID,
    "origin" "ClipOriginRecord" NOT NULL,
    "start_ms" INTEGER NOT NULL,
    "end_ms" INTEGER NOT NULL,
    "title" VARCHAR(120),
    "rank" INTEGER,
    "score_json" JSONB,
    "caption_json" JSONB NOT NULL,
    "style_json" JSONB NOT NULL,
    "frame_json" JSONB NOT NULL,
    "state" "ClipStateRecord" NOT NULL DEFAULT 'CANDIDATE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "clips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "renders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "clip_id" UUID NOT NULL,
    "status" "RenderStatusRecord" NOT NULL DEFAULT 'QUEUED',
    "input_snapshot_json" JSONB NOT NULL,
    "output_object_key" TEXT,
    "srt_object_key" TEXT,
    "probe_json" JSONB,
    "encoder" VARCHAR(100) NOT NULL,
    "started_at" TIMESTAMPTZ(3),
    "finished_at" TIMESTAMPTZ(3),
    "duration_ms" INTEGER,
    "error_code" VARCHAR(100),
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "renders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_projections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "workflow_id" UUID NOT NULL,
    "run_id" VARCHAR(200) NOT NULL,
    "status" "JobStatusRecord" NOT NULL,
    "stage" VARCHAR(100) NOT NULL,
    "progress_basis_points" INTEGER NOT NULL,
    "eta_low_seconds" INTEGER,
    "eta_high_seconds" INTEGER,
    "terminal_result_json" JSONB,
    "last_heartbeat_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "job_projections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stage_timing_observations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "stage" VARCHAR(100) NOT NULL,
    "hardware_key" VARCHAR(200) NOT NULL,
    "backend_key" VARCHAR(200) NOT NULL,
    "work_units" BIGINT NOT NULL,
    "duration_ms" INTEGER NOT NULL,
    "throughput_microunits" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stage_timing_observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upload_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "source_asset_id" UUID NOT NULL,
    "file_name" TEXT NOT NULL,
    "content_type" VARCHAR(255) NOT NULL,
    "total_parts" INTEGER NOT NULL,
    "object_key" TEXT NOT NULL,
    "upload_id" VARCHAR(300) NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "completed_parts_json" JSONB NOT NULL,
    "completion_parts_hash" CHAR(64),
    "object_version_id" TEXT,
    "object_sha256" CHAR(64),
    "status" "UploadStatusRecord" NOT NULL DEFAULT 'CREATED',
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "upload_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_receipts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" UUID NOT NULL,
    "scope" VARCHAR(100) NOT NULL,
    "request_hash" CHAR(64) NOT NULL,
    "status" VARCHAR(30) NOT NULL,
    "response_json" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(3),

    CONSTRAINT "idempotency_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "projects_status_created_at_idx" ON "projects"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "source_assets_project_id_key" ON "source_assets"("project_id");

-- CreateIndex
CREATE INDEX "source_assets_health_idx" ON "source_assets"("health");

-- CreateIndex
CREATE UNIQUE INDEX "transcripts_project_id_key" ON "transcripts"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "transcripts_source_asset_id_key" ON "transcripts"("source_asset_id");

-- CreateIndex
CREATE INDEX "analysis_runs_project_id_created_at_idx" ON "analysis_runs"("project_id", "created_at");

-- CreateIndex
CREATE INDEX "analysis_runs_status_idx" ON "analysis_runs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ai_usage_events_provider_response_id_key" ON "ai_usage_events"("provider_response_id");

-- CreateIndex
CREATE INDEX "ai_usage_events_analysis_run_id_occurred_at_idx" ON "ai_usage_events"("analysis_run_id", "occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "paid_call_reservations_call_id_key" ON "paid_call_reservations"("call_id");

-- CreateIndex
CREATE UNIQUE INDEX "paid_call_reservations_provider_response_id_key" ON "paid_call_reservations"("provider_response_id");

-- CreateIndex
CREATE UNIQUE INDEX "paid_call_reservations_usage_event_id_key" ON "paid_call_reservations"("usage_event_id");

-- CreateIndex
CREATE INDEX "paid_call_reservations_project_id_status_idx" ON "paid_call_reservations"("project_id", "status");

-- CreateIndex
CREATE INDEX "paid_call_reservations_analysis_run_id_status_idx" ON "paid_call_reservations"("analysis_run_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "cost_allocations_analysis_run_id_clip_id_key" ON "cost_allocations"("analysis_run_id", "clip_id");

-- CreateIndex
CREATE INDEX "clips_project_id_state_idx" ON "clips"("project_id", "state");

-- CreateIndex
CREATE INDEX "renders_clip_id_created_at_idx" ON "renders"("clip_id", "created_at");

-- CreateIndex
CREATE INDEX "renders_status_idx" ON "renders"("status");

-- CreateIndex
CREATE INDEX "job_projections_project_id_status_idx" ON "job_projections"("project_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "job_projections_workflow_id_run_id_key" ON "job_projections"("workflow_id", "run_id");

-- CreateIndex
CREATE INDEX "stage_timing_observations_stage_hardware_key_backend_key_cr_idx" ON "stage_timing_observations"("stage", "hardware_key", "backend_key", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "upload_sessions_upload_id_key" ON "upload_sessions"("upload_id");

-- CreateIndex
CREATE INDEX "upload_sessions_project_id_status_idx" ON "upload_sessions"("project_id", "status");


-- CreateIndex
CREATE UNIQUE INDEX "idempotency_receipts_key_key" ON "idempotency_receipts"("key");

-- AddForeignKey
ALTER TABLE "source_assets" ADD CONSTRAINT "source_assets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transcripts" ADD CONSTRAINT "transcripts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transcripts" ADD CONSTRAINT "transcripts_source_asset_id_fkey" FOREIGN KEY ("source_asset_id") REFERENCES "source_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_runs" ADD CONSTRAINT "analysis_runs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage_events" ADD CONSTRAINT "ai_usage_events_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage_events" ADD CONSTRAINT "ai_usage_events_analysis_run_id_fkey" FOREIGN KEY ("analysis_run_id") REFERENCES "analysis_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage_events" ADD CONSTRAINT "ai_usage_events_clip_id_fkey" FOREIGN KEY ("clip_id") REFERENCES "clips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paid_call_reservations" ADD CONSTRAINT "paid_call_reservations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paid_call_reservations" ADD CONSTRAINT "paid_call_reservations_analysis_run_id_fkey" FOREIGN KEY ("analysis_run_id") REFERENCES "analysis_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paid_call_reservations" ADD CONSTRAINT "paid_call_reservations_usage_event_id_fkey" FOREIGN KEY ("usage_event_id") REFERENCES "ai_usage_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_allocations" ADD CONSTRAINT "cost_allocations_analysis_run_id_fkey" FOREIGN KEY ("analysis_run_id") REFERENCES "analysis_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_allocations" ADD CONSTRAINT "cost_allocations_clip_id_fkey" FOREIGN KEY ("clip_id") REFERENCES "clips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clips" ADD CONSTRAINT "clips_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clips" ADD CONSTRAINT "clips_analysis_run_id_fkey" FOREIGN KEY ("analysis_run_id") REFERENCES "analysis_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "renders" ADD CONSTRAINT "renders_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "renders" ADD CONSTRAINT "renders_clip_id_fkey" FOREIGN KEY ("clip_id") REFERENCES "clips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_projections" ADD CONSTRAINT "job_projections_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_timing_observations" ADD CONSTRAINT "stage_timing_observations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upload_sessions" ADD CONSTRAINT "upload_sessions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "upload_sessions" ADD CONSTRAINT "upload_sessions_source_asset_id_fkey" FOREIGN KEY ("source_asset_id") REFERENCES "source_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE projects ADD CONSTRAINT projects_spend_nonnegative CHECK (openai_spend_microusd >= 0);
ALTER TABLE source_assets ADD CONSTRAINT source_assets_display_path_nonempty CHECK (length(btrim(display_path)) > 0);
ALTER TABLE source_assets ADD CONSTRAINT source_assets_reference_by_kind CHECK ((kind = 'LOCAL_FILE' AND object_key IS NULL AND object_version_id IS NULL AND object_sha256 IS NULL) OR (kind = 'BROWSER_UPLOAD' AND resolved_path IS NULL));
ALTER TABLE source_assets ADD CONSTRAINT source_assets_located_reference_complete CHECK (health NOT IN ('LOCATED','HEALTHY') OR (size_bytes IS NOT NULL AND ((kind = 'LOCAL_FILE' AND resolved_path IS NOT NULL AND modified_at IS NOT NULL AND fingerprint IS NOT NULL) OR (kind = 'BROWSER_UPLOAD' AND object_key IS NOT NULL AND object_sha256 ~ '^[0-9a-f]{64}$'))));
ALTER TABLE source_assets ADD CONSTRAINT source_assets_healthy_probe_complete CHECK (health <> 'HEALTHY' OR probe_json IS NOT NULL);
ALTER TABLE source_assets ADD CONSTRAINT source_assets_size_positive CHECK (size_bytes IS NULL OR size_bytes > 0);
ALTER TABLE transcripts ADD CONSTRAINT transcripts_metrics_nonnegative CHECK (duration_ms >= 0 AND word_count >= 0 AND runtime_ms >= 0);
ALTER TABLE transcripts ADD CONSTRAINT transcripts_object_reference_valid CHECK (object_bucket = 'clip-factory' AND length(btrim(object_key)) > 0 AND object_sha256 ~ '^[0-9a-f]{64}$');
ALTER TABLE transcripts ADD CONSTRAINT transcripts_model_hash_valid CHECK ((backend = 'FAKE' AND weights_sha256 IS NULL) OR (backend = 'MLX_WHISPER' AND weights_sha256 ~ '^[0-9a-f]{64}$'));
ALTER TABLE analysis_runs ADD CONSTRAINT analysis_runs_money_nonnegative CHECK (budget_microusd >= 0 AND estimated_max_microusd >= 0 AND actual_microusd >= 0 AND uncertain_call_count >= 0 AND uncertain_reserved_microusd >= 0);
ALTER TABLE analysis_runs ADD CONSTRAINT analysis_runs_coverage_valid CHECK (coverage_start_ms >= 0 AND coverage_end_ms > coverage_start_ms);
ALTER TABLE analysis_runs ADD CONSTRAINT analysis_runs_safety_valid CHECK (safety_numerator > 0 AND safety_denominator > 0);
ALTER TABLE ai_usage_events ADD CONSTRAINT ai_usage_events_usage_nonnegative CHECK (input_tokens >= 0 AND cached_input_tokens >= 0 AND cache_write_input_tokens >= 0 AND output_tokens >= 0 AND reasoning_tokens >= 0 AND cost_microusd >= 0);
ALTER TABLE ai_usage_events ADD CONSTRAINT ai_usage_events_input_details_valid CHECK (cached_input_tokens + cache_write_input_tokens <= input_tokens);
ALTER TABLE ai_usage_events ADD CONSTRAINT ai_usage_events_request_hash_valid CHECK (request_hash ~ '^[0-9a-f]{64}$');
ALTER TABLE paid_call_reservations ADD CONSTRAINT paid_call_reservation_cost_nonnegative CHECK (worst_case_microusd >= 0);
ALTER TABLE paid_call_reservations ADD CONSTRAINT paid_call_reservation_request_hash_valid CHECK (request_hash ~ '^[0-9a-f]{64}$');
ALTER TABLE cost_allocations ADD CONSTRAINT cost_allocations_amount_nonnegative CHECK (amount_microusd >= 0);
ALTER TABLE clips ADD CONSTRAINT clips_range_valid CHECK (start_ms >= 0 AND end_ms > start_ms);
ALTER TABLE job_projections ADD CONSTRAINT job_progress_range CHECK (progress_basis_points BETWEEN 0 AND 10000);
ALTER TABLE stage_timing_observations ADD CONSTRAINT stage_timing_positive CHECK (work_units > 0 AND duration_ms > 0 AND throughput_microunits > 0);
ALTER TABLE upload_sessions ADD CONSTRAINT upload_size_positive CHECK (size_bytes > 0);
ALTER TABLE upload_sessions ADD CONSTRAINT upload_completion_reference_valid CHECK (status <> 'COMPLETED' OR (completion_parts_hash ~ '^[0-9a-f]{64}$' AND object_sha256 ~ '^[0-9a-f]{64}$'));
