# Task 6: Create the Prisma 7 Core Data Model and Reviewed Migration

> **For agentic workers:** Use superpowers:test-driven-development and design-postgres-schema. Write the database assertion first, witness it fail on a fresh database, then add schema and reviewed SQL.

## Purpose and traceability

Implement design §§19 and 25 with PostgreSQL from the first application commit, Prisma 7 ESM plus `@prisma/adapter-pg`, typed money/state/relationships, and a complete baseline migration.

## Layers and boundaries

- Prisma and generated types live only in `apps/web/src/infrastructure/prisma` and feature persistence adapters.
- Repositories later expose Record DTOs, never Prisma models.
- Python has no database dependency or schema import.

## Exact files

- Create: `prisma/schema.prisma`, `prisma.config.ts`, `prisma/migrations/migration_lock.toml`, `prisma/migrations/20260711000100_phase_1_core/migration.sql`
- Create: `apps/web/src/infrastructure/prisma/client.ts`, `apps/web/src/infrastructure/prisma/client.test.ts`
- Create: `tests/integration/support/prisma-test-client.ts`, `tests/integration/database/core-schema.test.ts`
- Modify: `package.json`, `apps/web/package.json`, `.env.example`, `.gitignore`
- Generate: `apps/web/src/generated/prisma/client.ts`
- Generate: `apps/web/src/generated/prisma/enums.ts`
- Generate: `apps/web/src/generated/prisma/models.ts`
- Generate: `apps/web/src/generated/prisma/models/Project.ts`
- Generate: `apps/web/src/generated/prisma/models/SourceAsset.ts`
- Generate: `apps/web/src/generated/prisma/models/Transcript.ts`
- Generate: `apps/web/src/generated/prisma/models/AnalysisRun.ts`
- Generate: `apps/web/src/generated/prisma/models/AIUsageEvent.ts`
- Generate: `apps/web/src/generated/prisma/models/PaidCallReservation.ts`
- Generate: `apps/web/src/generated/prisma/models/CostAllocation.ts`
- Generate: `apps/web/src/generated/prisma/models/Clip.ts`
- Generate: `apps/web/src/generated/prisma/models/Render.ts`
- Generate: `apps/web/src/generated/prisma/models/JobProjection.ts`
- Generate: `apps/web/src/generated/prisma/models/StageTimingObservation.ts`
- Generate: `apps/web/src/generated/prisma/models/UploadSession.ts`
- Generate: `apps/web/src/generated/prisma/models/IdempotencyReceipt.ts`

## Prerequisites and conventions

- Requires Tasks 3–4.
- Models are singular PascalCase, fields camelCase with explicit snake_case `@map`, and tables plural snake_case with `@@map`.
- IDs are database-generated UUIDs; timestamps are UTC `timestamptz`; money is nonnegative `BigInt` micro-USD; JSONB has application schema validation.

## Exact model fields

| Model / table | Fields |
|---|---|
| `Project` / `projects` | `id`, `name`, `mode`, `languageTag`, `defaultMaxClipSeconds`, `defaultPlatformPreset`, `status`, `activeWorkflowId`, `openaiSpendMicrousd`, `createdAt`, `updatedAt` |
| `SourceAsset` / `source_assets` | `id`, `projectId`, `kind`, `displayPath`, `resolvedPath`, `objectKey`, `sizeBytes`, `modifiedAt`, `fingerprint`, `probeJson`, `health`, `createdAt`, `updatedAt` |
| `Transcript` / `transcripts` | `id`, `projectId`, `sourceAssetId`, `backend`, `model`, `modelRevision`, `languageTag`, `objectKey`, `durationMs`, `wordCount`, `runtimeMs`, `createdAt` |
| `AnalysisRun` / `analysis_runs` | `id`, `projectId`, `modelId`, `reasoning`, `promptVersion`, `schemaVersion`, `pricingVersion`, `budgetMicrousd`, `safetyNumerator`, `safetyDenominator`, `coverageStartMs`, `coverageEndMs`, `estimatedMaxMicrousd`, `actualMicrousd`, `status`, `createdAt`, `updatedAt` |
| `AIUsageEvent` / `ai_usage_events` | `id`, `projectId`, `analysisRunId`, `clipId`, `providerResponseId`, `purpose`, `modelId`, `reasoning`, `promptVersion`, `schemaVersion`, `pricingVersion`, `inputTokens`, `cachedInputTokens`, `outputTokens`, `reasoningTokens`, `pricingTier`, `costMicrousd`, `occurredAt`, `createdAt` |
| `CostAllocation` / `cost_allocations` | `id`, `analysisRunId`, `clipId`, `method`, `amountMicrousd`, `createdAt` |
| `Clip` / `clips` | `id`, `projectId`, `analysisRunId`, `origin`, `startMs`, `endMs`, `title`, `rank`, `scoreJson`, `captionJson`, `styleJson`, `frameJson`, `state`, `createdAt`, `updatedAt` |
| `Render` / `renders` | `id`, `projectId`, `clipId`, `status`, `inputSnapshotJson`, `outputObjectKey`, `srtObjectKey`, `probeJson`, `encoder`, `startedAt`, `finishedAt`, `durationMs`, `errorCode`, `errorMessage`, `createdAt` |
| `JobProjection` / `job_projections` | `id`, `projectId`, `workflowId`, `runId`, `status`, `stage`, `progressBasisPoints`, `etaLowSeconds`, `etaHighSeconds`, `terminalResultJson`, `lastHeartbeatAt`, `createdAt`, `updatedAt` |
| `StageTimingObservation` / `stage_timing_observations` | `id`, `projectId`, `stage`, `hardwareKey`, `backendKey`, `workUnits`, `durationMs`, `throughputMicrounits`, `createdAt` |
| `UploadSession` / `upload_sessions` | `id`, `projectId`, `objectKey`, `uploadId`, `sizeBytes`, `completedPartsJson`, `status`, `expiresAt`, `createdAt`, `updatedAt` |
| `IdempotencyReceipt` / `idempotency_receipts` | `id`, `key`, `scope`, `requestHash`, `status`, `responseJson`, `createdAt`, `completedAt` |

Enums are separate persistence enums: `ProjectModeRecord`, `ProjectStatusRecord`, `SourceKindRecord`, `SourceHealthRecord`, `AnalysisStatusRecord`, `ClipOriginRecord`, `ClipStateRecord`, `RenderStatusRecord`, `JobStatusRecord`, `UploadStatusRecord`, `AllocationMethodRecord`, `ReasoningRecord`, and `PlatformPresetRecord`.

## RED → GREEN → REFACTOR

- [ ] **RED: write schema behavior before Prisma files.**

```ts
// tests/integration/database/core-schema.test.ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { makePrismaTestClient, resetDatabase } from '../support/prisma-test-client';

describe('Phase 1 core schema', () => {
  const prisma = makePrismaTestClient();
  beforeAll(() => resetDatabase());
  afterAll(() => prisma.$disconnect());

  it('rejects negative spend and duplicate provider response IDs', async () => {
    await expect(prisma.project.create({ data: { name: 'Sample', mode: 'MANUAL', languageTag: 'en', defaultMaxClipSeconds: 60, defaultPlatformPreset: 'YOUTUBE_SHORTS', status: 'DRAFT', openaiSpendMicrousd: -1n } })).rejects.toThrow();
    const project = await prisma.project.create({ data: { name: 'Sample', mode: 'AI_HIGHLIGHTS', languageTag: 'en', defaultMaxClipSeconds: 60, defaultPlatformPreset: 'YOUTUBE_SHORTS', status: 'DRAFT' } });
    const run = await prisma.analysisRun.create({ data: { projectId: project.id, modelId: 'gpt-5.6-sol', reasoning: 'HIGH', promptVersion: 'highlights-1', schemaVersion: '1.0.0', pricingVersion: 'openai-2026-07-11.1', budgetMicrousd: 1000000n, safetyNumerator: 3, safetyDenominator: 2, coverageStartMs: 0, coverageEndMs: 60000, estimatedMaxMicrousd: 500000n, actualMicrousd: 0n, status: 'PLANNED' } });
    const usage = { projectId: project.id, analysisRunId: run.id, providerResponseId: 'resp_001', purpose: 'HIGHLIGHT_WINDOW', modelId: 'gpt-5.6-sol', reasoning: 'HIGH', promptVersion: 'highlights-1', schemaVersion: '1.0.0', pricingVersion: 'openai-2026-07-11.1', inputTokens: 100, cachedInputTokens: 0, outputTokens: 50, reasoningTokens: 20, pricingTier: 'STANDARD', costMicrousd: 900n, occurredAt: new Date('2026-07-11T00:00:00Z') };
    await prisma.aIUsageEvent.create({ data: usage });
    await expect(prisma.aIUsageEvent.create({ data: usage })).rejects.toThrow();
  });
});
```

- [ ] Run `pnpm compose:up && pnpm exec vitest run tests/integration/database/core-schema.test.ts`; expect module-resolution FAIL because generated Prisma/client support is absent.

- [ ] **GREEN: create the complete Prisma 7 schema below.**

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client"
  output   = "../apps/web/src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

enum ProjectModeRecord { AI_HIGHLIGHTS MANUAL }
enum ProjectStatusRecord { DRAFT VALIDATING_SOURCE UPLOADING QUEUED PREPROCESSING TRANSCRIBING VERIFYING_BUDGET AWAITING_BUDGET ANALYZING GENERATING_PREVIEWS AWAITING_REVIEW RENDERING COMPLETED FAILED CANCELLED SOURCE_MISSING SOURCE_CHANGED SOURCE_NOT_ALLOWED RELINKING_SOURCE }
enum SourceKindRecord { LOCAL_FILE BROWSER_UPLOAD }
enum SourceHealthRecord { UNKNOWN LOCATED HEALTHY MISSING CHANGED NOT_ALLOWED INVALID }
enum AnalysisStatusRecord { PLANNED VERIFYING_BUDGET AWAITING_BUDGET RUNNING PAID_CALL_UNCERTAIN COMPLETED FAILED CANCELLED }
enum ClipOriginRecord { AI_HIGHLIGHT MANUAL }
enum ClipStateRecord { CANDIDATE ACCEPTED REJECTED PREVIEW_READY RENDERING RENDERED FAILED }
enum RenderStatusRecord { QUEUED RUNNING COMPLETED FAILED CANCELLED }
enum JobStatusRecord { QUEUED RUNNING WAITING COMPLETED FAILED CANCELLED WORKER_OFFLINE }
enum UploadStatusRecord { CREATED UPLOADING COMPLETED ABORTED EXPIRED }
enum PaidCallStatusRecord { RESERVED SENT COMPLETED UNCERTAIN ABANDONED }
enum AllocationMethodRecord { EQUAL_SHARE }
enum ReasoningRecord { NONE LOW MEDIUM HIGH XHIGH MAX }
enum PlatformPresetRecord { YOUTUBE_SHORTS INSTAGRAM_REELS TIKTOK }

model Project {
  id                    String               @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name                  String               @db.VarChar(200)
  mode                  ProjectModeRecord
  languageTag           String               @map("language_tag") @db.VarChar(35)
  defaultMaxClipSeconds Int                  @map("default_max_clip_seconds")
  defaultPlatformPreset PlatformPresetRecord @map("default_platform_preset")
  status                ProjectStatusRecord  @default(DRAFT)
  activeWorkflowId      String?              @map("active_workflow_id") @db.Uuid
  openaiSpendMicrousd   BigInt               @default(0) @map("openai_spend_microusd")
  createdAt             DateTime             @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt             DateTime             @updatedAt @map("updated_at") @db.Timestamptz(3)
  sourceAsset           SourceAsset?
  transcript            Transcript?
  analysisRuns          AnalysisRun[]
  usageEvents           AIUsageEvent[]
  paidCallReservations  PaidCallReservation[]
  clips                 Clip[]
  renders               Render[]
  jobProjections        JobProjection[]
  timingObservations    StageTimingObservation[]
  uploadSessions        UploadSession[]
  @@index([status, createdAt])
  @@map("projects")
}

model SourceAsset {
  id           String             @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  projectId    String             @unique @map("project_id") @db.Uuid
  kind         SourceKindRecord
  displayPath  String             @map("display_path") @db.Text
  resolvedPath String?            @map("resolved_path") @db.Text
  objectKey    String?            @map("object_key") @db.Text
  sizeBytes    BigInt?            @map("size_bytes")
  modifiedAt   DateTime?          @map("modified_at") @db.Timestamptz(3)
  fingerprint  String?            @db.VarChar(128)
  probeJson    Json?              @map("probe_json") @db.JsonB
  health       SourceHealthRecord @default(UNKNOWN)
  createdAt    DateTime           @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt    DateTime           @updatedAt @map("updated_at") @db.Timestamptz(3)
  project      Project            @relation(fields: [projectId], references: [id], onDelete: Cascade)
  transcript   Transcript?
  @@index([health])
  @@map("source_assets")
}

model Transcript {
  id            String      @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  projectId     String      @unique @map("project_id") @db.Uuid
  sourceAssetId String      @unique @map("source_asset_id") @db.Uuid
  backend       String      @db.VarChar(100)
  model         String      @db.VarChar(200)
  modelRevision String      @map("model_revision") @db.VarChar(200)
  languageTag   String      @map("language_tag") @db.VarChar(35)
  objectKey     String      @map("object_key") @db.Text
  durationMs    Int         @map("duration_ms")
  wordCount     Int         @map("word_count")
  runtimeMs     Int         @map("runtime_ms")
  createdAt     DateTime    @default(now()) @map("created_at") @db.Timestamptz(3)
  project       Project     @relation(fields: [projectId], references: [id], onDelete: Cascade)
  sourceAsset   SourceAsset @relation(fields: [sourceAssetId], references: [id], onDelete: Cascade)
  @@map("transcripts")
}

model AnalysisRun {
  id                    String               @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  projectId             String               @map("project_id") @db.Uuid
  modelId               String               @map("model_id") @db.VarChar(200)
  reasoning             ReasoningRecord
  promptVersion         String               @map("prompt_version") @db.VarChar(100)
  schemaVersion         String               @map("schema_version") @db.VarChar(30)
  pricingVersion        String               @map("pricing_version") @db.VarChar(100)
  budgetMicrousd        BigInt               @map("budget_microusd")
  safetyNumerator       Int                  @default(3) @map("safety_numerator")
  safetyDenominator     Int                  @default(2) @map("safety_denominator")
  coverageStartMs       Int                  @map("coverage_start_ms")
  coverageEndMs         Int                  @map("coverage_end_ms")
  estimatedMaxMicrousd  BigInt               @map("estimated_max_microusd")
  actualMicrousd        BigInt               @default(0) @map("actual_microusd")
  uncertainCallCount    Int                  @default(0) @map("uncertain_call_count")
  uncertainReservedMicrousd BigInt           @default(0) @map("uncertain_reserved_microusd")
  status                AnalysisStatusRecord @default(PLANNED)
  createdAt             DateTime             @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt             DateTime             @updatedAt @map("updated_at") @db.Timestamptz(3)
  project               Project              @relation(fields: [projectId], references: [id], onDelete: Cascade)
  usageEvents           AIUsageEvent[]
  allocations           CostAllocation[]
  clips                 Clip[]
  @@index([projectId, createdAt])
  @@index([status])
  @@map("analysis_runs")
}

model AIUsageEvent {
  id                   String          @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  projectId            String          @map("project_id") @db.Uuid
  analysisRunId        String          @map("analysis_run_id") @db.Uuid
  clipId               String?         @map("clip_id") @db.Uuid
  providerResponseId   String          @unique @map("provider_response_id") @db.VarChar(200)
  purpose              String          @db.VarChar(100)
  modelId              String          @map("model_id") @db.VarChar(200)
  reasoning            ReasoningRecord
  promptVersion        String          @map("prompt_version") @db.VarChar(100)
  schemaVersion        String          @map("schema_version") @db.VarChar(30)
  pricingVersion       String          @map("pricing_version") @db.VarChar(100)
  inputTokens          Int             @map("input_tokens")
  cachedInputTokens    Int             @map("cached_input_tokens")
  cacheWriteInputTokens Int            @map("cache_write_input_tokens")
  outputTokens         Int             @map("output_tokens")
  reasoningTokens      Int             @map("reasoning_tokens")
  pricingTier          String          @map("pricing_tier") @db.VarChar(50)
  costMicrousd         BigInt          @map("cost_microusd")
  occurredAt           DateTime        @map("occurred_at") @db.Timestamptz(3)
  createdAt            DateTime        @default(now()) @map("created_at") @db.Timestamptz(3)
  project              Project         @relation(fields: [projectId], references: [id], onDelete: Cascade)
  analysisRun          AnalysisRun     @relation(fields: [analysisRunId], references: [id], onDelete: Cascade)
  clip                 Clip?           @relation(fields: [clipId], references: [id], onDelete: SetNull)
  paidCallReservation  PaidCallReservation?
  @@index([analysisRunId, occurredAt])
  @@map("ai_usage_events")
}

model PaidCallReservation {
  id                     String               @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  analysisRunId          String               @map("analysis_run_id") @db.Uuid
  callId                 String               @unique @map("call_id") @db.Uuid
  requestHash            String               @map("request_hash") @db.Char(64)
  worstCaseMicrousd      BigInt               @map("worst_case_microusd")
  status                 PaidCallStatusRecord @default(RESERVED)
  providerResponseId     String?              @unique @map("provider_response_id") @db.VarChar(200)
  responseObjectKey      String?              @map("response_object_key") @db.Text
  usageEventId           String?              @unique @map("usage_event_id") @db.Uuid
  createdAt              DateTime             @default(now()) @map("created_at") @db.Timestamptz(3)
  sentAt                 DateTime?            @map("sent_at") @db.Timestamptz(3)
  completedAt            DateTime?            @map("completed_at") @db.Timestamptz(3)
  analysisRun            AnalysisRun          @relation(fields: [analysisRunId], references: [id], onDelete: Cascade)
  usageEvent             AIUsageEvent?         @relation(fields: [usageEventId], references: [id], onDelete: SetNull)
  @@index([analysisRunId, status])
  @@map("paid_call_reservations")
}

model CostAllocation {
  id              String                 @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  analysisRunId   String                 @map("analysis_run_id") @db.Uuid
  clipId          String                 @map("clip_id") @db.Uuid
  method          AllocationMethodRecord @default(EQUAL_SHARE)
  amountMicrousd  BigInt                 @map("amount_microusd")
  createdAt       DateTime               @default(now()) @map("created_at") @db.Timestamptz(3)
  analysisRun     AnalysisRun            @relation(fields: [analysisRunId], references: [id], onDelete: Cascade)
  clip            Clip                   @relation(fields: [clipId], references: [id], onDelete: Cascade)
  @@unique([analysisRunId, clipId])
  @@map("cost_allocations")
}

model Clip {
  id            String           @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  projectId     String           @map("project_id") @db.Uuid
  analysisRunId String?          @map("analysis_run_id") @db.Uuid
  origin        ClipOriginRecord
  startMs       Int              @map("start_ms")
  endMs         Int              @map("end_ms")
  title         String?          @db.VarChar(120)
  rank          Int?
  scoreJson     Json?            @map("score_json") @db.JsonB
  captionJson   Json             @map("caption_json") @db.JsonB
  styleJson     Json             @map("style_json") @db.JsonB
  frameJson     Json             @map("frame_json") @db.JsonB
  state         ClipStateRecord  @default(CANDIDATE)
  createdAt     DateTime         @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt     DateTime         @updatedAt @map("updated_at") @db.Timestamptz(3)
  project       Project          @relation(fields: [projectId], references: [id], onDelete: Cascade)
  analysisRun   AnalysisRun?     @relation(fields: [analysisRunId], references: [id], onDelete: SetNull)
  usageEvents   AIUsageEvent[]
  allocations   CostAllocation[]
  renders       Render[]
  @@index([projectId, state])
  @@map("clips")
}

model Render {
  id                String             @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  projectId         String             @map("project_id") @db.Uuid
  clipId            String             @map("clip_id") @db.Uuid
  status            RenderStatusRecord @default(QUEUED)
  inputSnapshotJson Json               @map("input_snapshot_json") @db.JsonB
  outputObjectKey   String?            @map("output_object_key") @db.Text
  srtObjectKey      String?            @map("srt_object_key") @db.Text
  probeJson         Json?              @map("probe_json") @db.JsonB
  encoder           String             @db.VarChar(100)
  startedAt         DateTime?          @map("started_at") @db.Timestamptz(3)
  finishedAt        DateTime?          @map("finished_at") @db.Timestamptz(3)
  durationMs        Int?               @map("duration_ms")
  errorCode         String?            @map("error_code") @db.VarChar(100)
  errorMessage      String?            @map("error_message") @db.Text
  createdAt         DateTime           @default(now()) @map("created_at") @db.Timestamptz(3)
  project           Project            @relation(fields: [projectId], references: [id], onDelete: Cascade)
  clip              Clip               @relation(fields: [clipId], references: [id], onDelete: Cascade)
  @@index([clipId, createdAt])
  @@index([status])
  @@map("renders")
}

model JobProjection {
  id                  String          @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  projectId           String          @map("project_id") @db.Uuid
  workflowId          String          @map("workflow_id") @db.Uuid
  runId               String          @map("run_id") @db.VarChar(200)
  status              JobStatusRecord
  stage               String          @db.VarChar(100)
  progressBasisPoints Int             @map("progress_basis_points")
  etaLowSeconds       Int?            @map("eta_low_seconds")
  etaHighSeconds      Int?            @map("eta_high_seconds")
  terminalResultJson  Json?           @map("terminal_result_json") @db.JsonB
  lastHeartbeatAt     DateTime?       @map("last_heartbeat_at") @db.Timestamptz(3)
  createdAt           DateTime        @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt           DateTime        @updatedAt @map("updated_at") @db.Timestamptz(3)
  project             Project         @relation(fields: [projectId], references: [id], onDelete: Cascade)
  @@unique([workflowId, runId])
  @@index([projectId, status])
  @@map("job_projections")
}

model StageTimingObservation {
  id                   String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  projectId            String   @map("project_id") @db.Uuid
  stage                String   @db.VarChar(100)
  hardwareKey          String   @map("hardware_key") @db.VarChar(200)
  backendKey           String   @map("backend_key") @db.VarChar(200)
  workUnits            BigInt   @map("work_units")
  durationMs           Int      @map("duration_ms")
  throughputMicrounits BigInt   @map("throughput_microunits")
  createdAt            DateTime @default(now()) @map("created_at") @db.Timestamptz(3)
  project              Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  @@index([stage, hardwareKey, backendKey, createdAt])
  @@map("stage_timing_observations")
}

model UploadSession {
  id                 String             @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  projectId          String             @map("project_id") @db.Uuid
  objectKey          String             @map("object_key") @db.Text
  uploadId           String             @unique @map("upload_id") @db.VarChar(300)
  sizeBytes          BigInt             @map("size_bytes")
  completedPartsJson Json               @map("completed_parts_json") @db.JsonB
  status             UploadStatusRecord @default(CREATED)
  expiresAt          DateTime           @map("expires_at") @db.Timestamptz(3)
  createdAt          DateTime           @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt          DateTime           @updatedAt @map("updated_at") @db.Timestamptz(3)
  project            Project            @relation(fields: [projectId], references: [id], onDelete: Cascade)
  @@index([projectId, status])
  @@map("upload_sessions")
}

model IdempotencyReceipt {
  id           String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  key          String    @unique @db.Uuid
  scope        String    @db.VarChar(100)
  requestHash  String    @map("request_hash") @db.Char(64)
  status       String    @db.VarChar(30)
  responseJson Json?     @map("response_json") @db.JsonB
  createdAt    DateTime  @default(now()) @map("created_at") @db.Timestamptz(3)
  completedAt  DateTime? @map("completed_at") @db.Timestamptz(3)
  @@map("idempotency_receipts")
}
```

Append these exact checks to the generated SQL before its first commit:

```sql
ALTER TABLE projects ADD CONSTRAINT projects_spend_nonnegative CHECK (openai_spend_microusd >= 0);
ALTER TABLE source_assets ADD CONSTRAINT source_assets_display_path_nonempty CHECK (length(btrim(display_path)) > 0);
ALTER TABLE source_assets ADD CONSTRAINT source_assets_reference_by_kind CHECK ((kind = 'LOCAL_FILE' AND object_key IS NULL) OR (kind = 'BROWSER_UPLOAD' AND resolved_path IS NULL));
ALTER TABLE source_assets ADD CONSTRAINT source_assets_located_reference_complete CHECK (health NOT IN ('LOCATED','HEALTHY') OR (size_bytes IS NOT NULL AND ((kind = 'LOCAL_FILE' AND resolved_path IS NOT NULL AND modified_at IS NOT NULL AND fingerprint IS NOT NULL) OR (kind = 'BROWSER_UPLOAD' AND object_key IS NOT NULL))));
ALTER TABLE source_assets ADD CONSTRAINT source_assets_healthy_probe_complete CHECK (health <> 'HEALTHY' OR probe_json IS NOT NULL);
ALTER TABLE source_assets ADD CONSTRAINT source_assets_size_positive CHECK (size_bytes IS NULL OR size_bytes > 0);
ALTER TABLE transcripts ADD CONSTRAINT transcripts_metrics_nonnegative CHECK (duration_ms >= 0 AND word_count >= 0 AND runtime_ms >= 0);
ALTER TABLE analysis_runs ADD CONSTRAINT analysis_runs_money_nonnegative CHECK (budget_microusd >= 0 AND estimated_max_microusd >= 0 AND actual_microusd >= 0 AND uncertain_call_count >= 0 AND uncertain_reserved_microusd >= 0);
ALTER TABLE analysis_runs ADD CONSTRAINT analysis_runs_coverage_valid CHECK (coverage_start_ms >= 0 AND coverage_end_ms > coverage_start_ms);
ALTER TABLE analysis_runs ADD CONSTRAINT analysis_runs_safety_valid CHECK (safety_numerator > 0 AND safety_denominator > 0);
ALTER TABLE ai_usage_events ADD CONSTRAINT ai_usage_events_usage_nonnegative CHECK (input_tokens >= 0 AND cached_input_tokens >= 0 AND cache_write_input_tokens >= 0 AND output_tokens >= 0 AND reasoning_tokens >= 0 AND cost_microusd >= 0);
ALTER TABLE ai_usage_events ADD CONSTRAINT ai_usage_events_input_details_valid CHECK (cached_input_tokens + cache_write_input_tokens <= input_tokens);
ALTER TABLE paid_call_reservations ADD CONSTRAINT paid_call_reservation_cost_nonnegative CHECK (worst_case_microusd >= 0);
ALTER TABLE cost_allocations ADD CONSTRAINT cost_allocations_amount_nonnegative CHECK (amount_microusd >= 0);
ALTER TABLE clips ADD CONSTRAINT clips_range_valid CHECK (start_ms >= 0 AND end_ms > start_ms);
ALTER TABLE job_projections ADD CONSTRAINT job_progress_range CHECK (progress_basis_points BETWEEN 0 AND 10000);
ALTER TABLE stage_timing_observations ADD CONSTRAINT stage_timing_positive CHECK (work_units > 0 AND duration_ms > 0 AND throughput_microunits > 0);
ALTER TABLE upload_sessions ADD CONSTRAINT upload_size_positive CHECK (size_bytes > 0);
```

```ts
// apps/web/src/infrastructure/prisma/client.ts
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';
import { loadServerEnv } from '@/config/server-env';

const env = loadServerEnv();
const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
export const prisma = new PrismaClient({ adapter });
```

- [ ] Run `pnpm prisma:generate && pnpm db:migrate:deploy && pnpm exec vitest run tests/integration/database/core-schema.test.ts`; expect PASS.

- [ ] **RED: test migration history from zero.** Drop and recreate the disposable database, then run `pnpm db:migrate:deploy` twice. The first run must fail until the checked-in baseline SQL exists; the second must become a no-op after it exists.

- [ ] **GREEN:** generate the migration only with `pnpm db:migrate:dev --name phase_1_core`, review the SQL into exact directory `20260711000100_phase_1_core`, and add explicit checks/indexes omitted by generation. Never edit it after a later migration exists.

- [ ] **REFACTOR:** add direct tests proving pending `LOCAL_FILE` and `BROWSER_UPLOAD` rows may have null validated locators while health is `UNKNOWN`; `LOCATED` local rows require resolved path/mtime/fingerprint/size; `LOCATED` uploads require object key/size; and `HEALTHY` additionally requires a probe. Also cover UTC normalization, 64-bit micro-USD round-trip, cascade behavior, kind exclusivity, clip bounds, and every unique constraint. Ensure tests access Prisma only from integration support or persistence adapters.

## Broader verification

```bash
pnpm prisma:generate
pnpm exec prisma validate
pnpm db:migrate:deploy
pnpm exec vitest run tests/integration/database/core-schema.test.ts
pnpm test:architecture
git diff --check
```

Expected: fresh and repeated migration deploys succeed, constraints reject invalid records, and generated Prisma is absent from application/domain imports.

**Suggested commit:** `feat: add reviewed phase one postgres schema`
