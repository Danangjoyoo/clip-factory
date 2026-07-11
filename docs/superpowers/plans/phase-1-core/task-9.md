# Task 9: Resumable Multipart Upload and Scoped Object Storage

> **For agentic workers:** Use superpowers:test-driven-development. The application service must pass against an in-memory port before importing the S3 SDK adapter.

## Purpose and traceability

Implement browser upload and MinIO lifecycle from design §§8–9, 18, 22, and 24 without proxying media through Next.js.

## Boundaries, files, and prerequisites

- Requires Tasks 6–8.
- Application-owned ports: `MultipartUploadPort`, `ArtifactStorePort`, and `DownloadUrlPort`; AWS SDK types remain in `adapters/clients/minio`.
- `UploadSessionDataService` imports only `UploadSessionRepository`. Its repository contract accepts and returns Entity DTOs; the Prisma adapter alone converts Entity↔Record.
- `CompleteUploadService` coordinates `UploadSessionDataService`, Task 7's `SourceAssetDataService`, and `UnitOfWork`; neither application service sees Prisma or Record DTOs.
- Create: `apps/web/src/modules/storage/application/ports/multipart-upload.port.ts`
- Create: `apps/web/src/modules/storage/application/ports/artifact-store.port.ts`
- Create: `apps/web/src/modules/storage/application/ports/download-url.port.ts`
- Create: `apps/web/src/modules/storage/application/ports/upload-session.repository.ts`
- Create: `apps/web/src/modules/storage/application/dto/entity/upload-session-entity.dto.ts`
- Create: `apps/web/src/modules/storage/application/data-services/upload-session.data-service.ts`
- Create: `apps/web/src/modules/storage/application/services/start-upload.service.ts`
- Create: `apps/web/src/modules/storage/application/services/resume-upload.service.ts`
- Create: `apps/web/src/modules/storage/application/services/complete-upload.service.ts`
- Create: `apps/web/src/modules/storage/application/services/abort-upload.service.ts`
- Modify: `apps/web/src/modules/projects/application/data-services/source-asset.data-service.ts`
- Modify: `apps/web/src/modules/projects/application/ports/source-asset.repository.ts`
- Create: `apps/web/src/modules/storage/adapters/clients/minio/s3-multipart-upload.adapter.ts`
- Create: `apps/web/src/modules/storage/adapters/persistence/dto/record/upload-session-record.dto.ts`
- Create: `apps/web/src/modules/storage/adapters/persistence/repositories/prisma-upload-session.repository.ts`
- Create: `apps/web/src/modules/storage/delivery/http/dto/api/upload-api.dto.ts`
- Create: `apps/web/src/modules/storage/delivery/http/upload.controller.ts`
- Create: `apps/web/src/modules/storage/converters/api-entity/upload.converter.ts`
- Create: `apps/web/src/modules/storage/adapters/persistence/converters/upload-session.converter.ts`
- Create: `apps/web/src/modules/storage/composition/storage.composition.ts`
- Create: `apps/web/src/modules/storage/testing/upload-harness.ts`
- Test: `apps/web/src/modules/storage/application/services/start-upload.service.test.ts`
- Test: `apps/web/src/modules/storage/application/services/resume-upload.service.test.ts`
- Test: `apps/web/src/modules/storage/application/services/complete-upload.service.test.ts`
- Test: `apps/web/src/modules/storage/application/services/abort-upload.service.test.ts`
- Test: `apps/web/src/modules/storage/converters/api-entity/upload.converter.test.ts`
- Test: `apps/web/src/modules/storage/adapters/persistence/converters/upload-session.converter.test.ts`
- Test: `apps/web/src/modules/storage/adapters/clients/minio/s3-multipart-upload.adapter.test.ts`
- Test: `tests/integration/storage/multipart-upload.test.ts`
- Modify: `apps/web/package.json`
- Modify: `pnpm-lock.yaml`
- Pin `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` to `3.1085.0` without ranges.
- Create routes: `apps/web/src/app/api/projects/[projectId]/uploads/route.ts`, `uploads/[sessionId]/parts/route.ts`, and `uploads/[sessionId]/complete/route.ts`.

The fixed interfaces are:

```ts
export type CompletedPart = Readonly<{ partNumber: number; etag: string; sizeBytes: bigint }>;
export interface MultipartUploadPort {
  create(key: string, contentType: string): Promise<{ uploadId: string }>;
  presignPart(key: string, uploadId: string, partNumber: number, expiresSeconds: 900): Promise<string>;
  listParts(key: string, uploadId: string): Promise<readonly CompletedPart[]>;
  complete(key: string, uploadId: string, parts: readonly CompletedPart[]): Promise<{ versionId: string | null }>;
  abort(key: string, uploadId: string): Promise<void>;
}
export interface ArtifactStorePort {
  head(key: string): Promise<{ sizeBytes: bigint; versionId: string | null; sha256: string | null }>;
  deleteMany(keys: readonly string[]): Promise<void>;
}
export type ImmutableObjectReference = Readonly<{
  key: string;
  versionId: string | null;
  sha256: string;
  sizeBytes: bigint;
}>;

export interface UploadSessionRepository {
  requireOwned(sessionId: string, projectId: string, transaction?: TransactionContext): Promise<UploadSessionEntityDto>;
  markCompleted(sessionId: string, reference: ImmutableObjectReference, transaction: TransactionContext): Promise<UploadSessionEntityDto>;
  markAborted(sessionId: string, transaction?: TransactionContext): Promise<UploadSessionEntityDto>;
}
```

## RED → GREEN → REFACTOR

- [ ] **RED: write resume behavior first.**

```ts
import { expect, it } from 'vitest';
import { ResumeUploadService } from './resume-upload.service';
import { uploadHarness } from '../../testing/upload-harness';

it('presigns only incomplete parts and keeps the project-scoped generated key', async () => {
  const h = uploadHarness({ completed: [{ partNumber: 1, etag: 'etag-1', sizeBytes: 8n }] });
  const service = new ResumeUploadService(h.sessions, h.multipart);
  const result = await service.execute({ projectId: h.projectId, sessionId: h.sessionId, totalParts: 3 });
  expect(result.objectKey).toBe(`projects/${h.projectId}/sources/${h.sessionId}.mp4`);
  expect(result.parts.map((part) => part.partNumber)).toEqual([2, 3]);
  expect(h.multipart.presigned).toEqual([2, 3]);
});
```

- [ ] Create compile-safe Entity-only ports/DTOs and a `ResumeUploadService` shell returning no parts, verify typecheck passes, then run the test; expect the named remaining-part assertion to FAIL with an empty list.

- [ ] **GREEN: create the service with no SDK types.**

```ts
export class ResumeUploadService {
  constructor(
    private readonly sessions: UploadSessionDataService,
    private readonly multipart: MultipartUploadPort,
  ) {}

  async execute(input: Readonly<{ projectId: string; sessionId: string; totalParts: number }>) {
    const session = await this.sessions.requireOwned(input.sessionId, input.projectId);
    const completed = await this.multipart.listParts(session.objectKey, session.uploadId);
    const completedNumbers = new Set(completed.map((part) => part.partNumber));
    const parts = [] as Array<{ partNumber: number; url: string; expiresSeconds: 900 }>;
    for (let partNumber = 1; partNumber <= input.totalParts; partNumber += 1) {
      if (!completedNumbers.has(partNumber)) {
        parts.push({ partNumber, url: await this.multipart.presignPart(session.objectKey, session.uploadId, partNumber, 900), expiresSeconds: 900 });
      }
    }
    return { objectKey: session.objectKey, completed, parts } as const;
  }
}
```

- [ ] Run `pnpm exec vitest run apps/web/src/modules/storage/application/services/resume-upload.service.test.ts`; expect PASS.

- [ ] **RED: add table tests for invalid part number `0`, more than `10000` parts, path-bearing filename `../../key.mov`, declared size `10737418241`, completion size mismatch, and expired session.** Each row calls the relevant service and asserts typed codes `INVALID_PART`, `TOO_MANY_PARTS`, `INVALID_FILENAME`, `SOURCE_TOO_LARGE`, `UPLOAD_SIZE_MISMATCH`, and `UPLOAD_EXPIRED`.

- [ ] Run the exact key-policy table test; expect each named row assertion to FAIL because the compile-safe validator shell currently accepts every candidate key.

- [ ] **GREEN: create this key and validation policy.**

```ts
const MAX_SOURCE_BYTES = 10n * 1024n * 1024n * 1024n;
const EXTENSIONS = new Set(['mp4', 'mov', 'mkv', 'webm']);
export function sourceObjectKey(projectId: string, sessionId: string, fileName: string): string {
  const base = fileName.split(/[\\/]/u).at(-1) ?? '';
  const extension = base.split('.').at(-1)?.toLowerCase() ?? '';
  if (!EXTENSIONS.has(extension) || base !== fileName) throw new UploadError('INVALID_FILENAME');
  return `projects/${projectId}/sources/${sessionId}.${extension}`;
}
export function validateUpload(sizeBytes: bigint, totalParts: number): void {
  if (sizeBytes < 1n || sizeBytes > MAX_SOURCE_BYTES) throw new UploadError('SOURCE_TOO_LARGE');
  if (!Number.isInteger(totalParts) || totalParts < 1 || totalParts > 10000) throw new UploadError('TOO_MANY_PARTS');
}
```

- [ ] **RED: prove upload completion binds one immutable source reference atomically.** Add tests where completing a session calls `complete`, then `head`, and writes the same `{key,versionId,sha256,sizeBytes}` to both the upload session result and its `BROWSER_UPLOAD` `SourceAsset`, changing source health from `UNKNOWN` to `LOCATED`. Add named failure cases for missing SHA-256, exact-size mismatch, returned/head version mismatch, completing a session owned by another project, and attempting to bind a local-file source. Assert no database mutation on failure and `deleteMany([key])` after a newly completed invalid object.

- [ ] Run `pnpm exec vitest run apps/web/src/modules/storage/application/services/complete-upload.service.test.ts`; expect the behavioral assertions `expected source health LOCATED, received UNKNOWN` and `expected immutable object reference` to FAIL against the compiling service shell.

- [ ] **GREEN: complete, verify, and attach in one transaction.** `CompleteUploadService` sorts unique parts, calls `complete`, calls `head`, requires exact declared size and a lowercase 64-character SHA-256, and requires `complete.versionId === head.versionId` whenever both are non-null. It then executes one `UnitOfWork` transaction that calls `UploadSessionDataService.markCompleted` and `SourceAssetDataService.attachUploadedObject(projectId, reference)`. That source operation rejects non-upload sources and persists `objectKey`, `objectVersionId`, `objectSha256`, `sizeBytes`, and `health:'LOCATED'`. API→Entity conversion parses decimal size strings to `bigint`; Entity→API returns decimal strings.

```bash
# GREEN attachment: implement the exact files/functions named above.
pnpm exec vitest run apps/web/src/modules/storage
# Expected: PASS
```

- [ ] **RED/GREEN: make completion retry-safe.** A duplicate request with the identical ordered part set and identical verified object reference returns the recorded result without calling MinIO or mutating twice. A duplicate with different parts/reference returns `UPLOAD_ALREADY_COMPLETED_CONFLICT`. Add a transaction rollback test in which source attachment fails after the session update; neither row may commit. Persist the completion part-set hash and immutable reference in `UploadSessionEntityDto`/Record DTO so replay comparison is durable.

- [ ] **REFACTOR:** keep Entity↔Record conversion inside `PrismaUploadSessionRepository` and `PrismaSourceAssetRepository`. Architecture tests must reject `RecordDto`, Prisma, and AWS SDK imports from application ports/services/data services.

```bash
# REFACTOR attachment: implement the exact files/functions named above.
pnpm exec vitest run apps/web/src/modules/storage
# Expected: PASS
```

- [ ] Run `pnpm exec vitest run apps/web/src/modules/storage`; expect PASS.

- [ ] **REFACTOR:** implement `S3MultipartUploadAdapter` with `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` only in the adapter file. Configure bucket `clip-factory`, path-style local addressing, 900-second URLs, per-command bucket/key scope, and sanitized SDK errors. Add a MinIO integration test that uploads two 5 MiB parts, resumes after part 1, completes, heads exact size, and deletes the object.

```bash
# REFACTOR attachment: implement the exact files/functions named above.
pnpm exec vitest run apps/web/src/modules/storage
# Expected: PASS
```

## Verification and commit

```bash
pnpm exec vitest run apps/web/src/modules/storage
pnpm exec vitest run tests/integration/storage/multipart-upload.test.ts
pnpm test:architecture
git diff --check
```

Expected: uploads bypass Next.js bodies, resume omits completed parts, and every key is generated under its project prefix.

**Suggested commit:** `feat: add resumable scoped browser uploads`
