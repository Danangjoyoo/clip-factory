# Task 7: Project Persistence and Thin Public Project API

> **For agentic workers:** Use superpowers:test-driven-development, write-typescript-repository-layer, write-typescript-data-service-layer, write-typescript-service-layer, and write-typescript-controller-layer in that order.

## Purpose and traceability

Implement persistent projects/source metadata and localhost create/list/get/delete APIs from design §§10, 17, 19, 22, and 24, while demonstrating every TypeScript DTO boundary.

## Layers and owned boundaries

- Domain: `ProjectId` value and project invariants.
- Application: `ProjectEntityDto`, `SourceAssetEntityDto`, `ProjectRepository`, `SourceAssetRepository`, one-repository data services, `CreateProjectService`, `DeleteProjectService`.
- Persistence: `ProjectRecordDto`, `SourceAssetRecordDto`, Prisma repositories, Entity↔Record converters.
- Delivery: API DTOs, API↔Entity converters, controller, route handlers. Routes call one service each.

## Exact files

- Create: `apps/web/src/shared/domain/identifiers.ts`
- Create: `apps/web/src/shared/domain/index.ts`
- Create: `apps/web/src/modules/projects/domain/project.ts`
- Create: `apps/web/src/modules/projects/application/dto/entity/project-entity.dto.ts`
- Create: `apps/web/src/modules/projects/application/dto/entity/source-asset-entity.dto.ts`
- Create: `apps/web/src/modules/projects/application/dto/entity/index.ts`
- Create: `apps/web/src/modules/projects/application/ports/project.repository.ts`
- Create: `apps/web/src/modules/projects/application/ports/source-asset.repository.ts`
- Create: `apps/web/src/modules/projects/application/ports/workflow-control.port.ts`
- Create: `apps/web/src/modules/projects/application/ports/artifact-cleanup.port.ts`
- Create: `apps/web/src/modules/projects/application/ports/unit-of-work.port.ts`
- Create: `apps/web/src/modules/projects/application/data-services/project.data-service.ts`
- Create: `apps/web/src/modules/projects/application/data-services/source-asset.data-service.ts`
- Create: `apps/web/src/modules/projects/application/services/create-project.service.ts`
- Create: `apps/web/src/modules/projects/application/services/list-projects.service.ts`
- Create: `apps/web/src/modules/projects/application/services/get-project.service.ts`
- Create: `apps/web/src/modules/projects/application/services/delete-project.service.ts`
- Create: `apps/web/src/modules/projects/adapters/persistence/dto/record/project-record.dto.ts`
- Create: `apps/web/src/modules/projects/adapters/persistence/dto/record/source-asset-record.dto.ts`
- Create: `apps/web/src/modules/projects/adapters/persistence/repositories/prisma-project.repository.ts`
- Create: `apps/web/src/modules/projects/adapters/persistence/repositories/prisma-source-asset.repository.ts`
- Create: `apps/web/src/modules/projects/delivery/http/dto/api/project-api.dto.ts`
- Create: `apps/web/src/modules/projects/delivery/http/project.controller.ts`
- Create: `apps/web/src/modules/projects/converters/api-entity/project.converter.ts`
- Create: `apps/web/src/modules/projects/converters/entity-record/project.converter.ts`
- Create: `apps/web/src/modules/projects/converters/entity-record/source-asset.converter.ts`
- Create: `apps/web/src/modules/projects/composition/projects.composition.ts`
- Create: `apps/web/src/modules/projects/testing/repositories.ts`
- Test: `apps/web/src/modules/projects/converters/api-entity/project.converter.test.ts`
- Test: `apps/web/src/modules/projects/converters/entity-record/project.converter.test.ts`
- Test: `apps/web/src/modules/projects/converters/entity-record/source-asset.converter.test.ts`
- Test: `apps/web/src/modules/projects/application/data-services/project.data-service.test.ts`
- Test: `apps/web/src/modules/projects/application/data-services/source-asset.data-service.test.ts`
- Test: `apps/web/src/modules/projects/application/services/create-project.service.test.ts`
- Test: `apps/web/src/modules/projects/application/services/delete-project.service.test.ts`
- Test: `apps/web/src/modules/projects/adapters/persistence/repositories/prisma-project.repository.test.ts`
- Test: `apps/web/src/modules/projects/adapters/persistence/repositories/prisma-source-asset.repository.test.ts`
- Test: `apps/web/src/modules/projects/delivery/http/project.controller.test.ts`
- Create: `apps/web/src/app/api/projects/route.ts`, `apps/web/src/app/api/projects/[projectId]/route.ts`

## Prerequisites and produced interfaces

- Requires Tasks 2, 5, and 6.
- `CreateProjectEntityRequest` has `name`, `mode`, `languageTag`, `defaultMaxClipSeconds`, `defaultPlatformPreset`, and source union `{ kind:'LOCAL_FILE'; displayPath } | { kind:'BROWSER_UPLOAD'; fileName; sizeBytes }`.
- Produces `ProjectEntityDto` and `SourceAssetEntityDto` via their fixed public barrels.

## RED → GREEN → REFACTOR

- [ ] **RED: start with explicit API↔Entity conversion.**

```ts
// apps/web/src/modules/projects/converters/api-entity/project.converter.test.ts
import { expect, it } from 'vitest';
import { createProjectApiToEntity } from './project.converter';

it('maps API enums and source union explicitly', () => {
  expect(createProjectApiToEntity({ name: 'Interview', mode: 'MANUAL', language: 'en', maxClipSeconds: 60, platform: 'YOUTUBE_SHORTS', source: { type: 'FILEPATH', path: '/Users/me/Videos/interview.mov' } })).toEqual({ name: 'Interview', mode: 'MANUAL', languageTag: 'en', defaultMaxClipSeconds: 60, defaultPlatformPreset: 'YOUTUBE_SHORTS', source: { kind: 'LOCAL_FILE', displayPath: '/Users/me/Videos/interview.mov' } });
});
```

- [ ] Run `pnpm exec vitest run apps/web/src/modules/projects/converters/api-entity/project.converter.test.ts`; expect import FAIL because the converter is absent.

- [ ] **GREEN: create distinct enums and this exhaustive converter.**

```ts
export const ProjectModeApi = { AI_HIGHLIGHTS:'AI_HIGHLIGHTS', MANUAL:'MANUAL' } as const;
export const SourceTypeApi = { FILEPATH:'FILEPATH', UPLOAD:'UPLOAD' } as const;
export const PlatformPresetApi = { YOUTUBE_SHORTS:'YOUTUBE_SHORTS', INSTAGRAM_REELS:'INSTAGRAM_REELS', TIKTOK:'TIKTOK' } as const;
export const ProjectMode = { AI_HIGHLIGHTS:'AI_HIGHLIGHTS', MANUAL:'MANUAL' } as const;
export const SourceKind = { LOCAL_FILE:'LOCAL_FILE', BROWSER_UPLOAD:'BROWSER_UPLOAD' } as const;
export const PlatformPreset = { YOUTUBE_SHORTS:'YOUTUBE_SHORTS', INSTAGRAM_REELS:'INSTAGRAM_REELS', TIKTOK:'TIKTOK' } as const;
export function createProjectApiToEntity(input: CreateProjectApiRequest): CreateProjectEntityRequest {
  const source = input.source.type === SourceTypeApi.FILEPATH
    ? { kind:SourceKind.LOCAL_FILE, displayPath:input.source.path }
    : { kind:SourceKind.BROWSER_UPLOAD, fileName:input.source.fileName, sizeBytes:BigInt(input.source.sizeBytes) };
  return { name:input.name, mode:input.mode === ProjectModeApi.MANUAL ? ProjectMode.MANUAL : ProjectMode.AI_HIGHLIGHTS, languageTag:input.language, defaultMaxClipSeconds:input.maxClipSeconds, defaultPlatformPreset:PlatformPreset[input.platform], source };
}
```

- [ ] Run the converter test; expect PASS. Add and witness failing tests for unknown values, local/upload union exclusivity, optional display fields, and timestamp serialization, then implement only those mappings.

- [ ] **RED: test application policy with in-memory owned-port fakes.**

```ts
// apps/web/src/modules/projects/application/services/create-project.service.test.ts
import { expect, it } from 'vitest';
import { InMemoryProjectRepository, InMemorySourceAssetRepository } from '../../testing/repositories';
import { ProjectDataService } from '../data-services/project.data-service';
import { SourceAssetDataService } from '../data-services/source-asset.data-service';
import { CreateProjectService } from './create-project.service';

it('creates a DRAFT manual project and one local source atomically', async () => {
  const projects = new InMemoryProjectRepository();
  const sources = new InMemorySourceAssetRepository();
  const service = new CreateProjectService(new InMemoryUnitOfWork(), new ProjectDataService(projects), new SourceAssetDataService(sources));
  const result = await service.execute({ name: 'Interview', mode: 'MANUAL', languageTag: 'en', defaultMaxClipSeconds: 60, defaultPlatformPreset: 'YOUTUBE_SHORTS', source: { kind: 'LOCAL_FILE', displayPath: '/Users/me/Videos/interview.mov' } });
  expect(result.project.status).toBe('DRAFT');
  expect(result.project.openaiSpendMicrousd).toBe(0n);
  expect(result.source.projectId).toBe(result.project.id);
  expect(result.source.resolvedPath).toBeNull();
  expect(result.source.health).toBe('UNKNOWN');
});
```

- [ ] Run the service test; expect import FAIL for `CreateProjectService`.

- [ ] **GREEN: create one-table ports/data services and the transactional service.**

```ts
export interface ProjectRepository { insert(record: InsertProjectRecordDto, transaction: TransactionContext): Promise<ProjectRecordDto>; findById(id: string): Promise<ProjectRecordDto|null>; list(): Promise<readonly ProjectRecordDto[]>; delete(id: string, transaction: TransactionContext): Promise<void>; }
export interface SourceAssetRepository { insert(record: InsertSourceAssetRecordDto, transaction: TransactionContext): Promise<SourceAssetRecordDto>; findByProjectId(projectId: string): Promise<SourceAssetRecordDto|null>; deleteByProjectId(projectId: string, transaction: TransactionContext): Promise<void>; }
export class ProjectDataService { constructor(private readonly repository: ProjectRepository) {} create(input: CreateProjectEntityDto, transaction: TransactionContext) { return this.repository.insert(projectEntityToRecord(input), transaction).then(projectRecordToEntity); } }
export class SourceAssetDataService { constructor(private readonly repository: SourceAssetRepository) {} create(input: CreateSourceAssetEntityDto, transaction: TransactionContext) { return this.repository.insert(sourceAssetEntityToRecord(input), transaction).then(sourceAssetRecordToEntity); } }
export class CreateProjectService {
  constructor(private readonly unitOfWork: UnitOfWork, private readonly projects: ProjectDataService, private readonly sources: SourceAssetDataService) {}
  execute(input: CreateProjectEntityRequest) {
    return this.unitOfWork.execute(async (transaction) => {
      const project = await this.projects.create({ name:input.name, mode:input.mode, languageTag:input.languageTag, defaultMaxClipSeconds:input.defaultMaxClipSeconds, defaultPlatformPreset:input.defaultPlatformPreset, status:'DRAFT', activeWorkflowId:null, openaiSpendMicrousd:0n }, transaction);
      const source = await this.sources.create(Object.assign({ projectId:project.id, health:'UNKNOWN', resolvedPath:null, objectKey:null, fingerprint:null, probe:null }, input.source), transaction);
      return { project, source };
    });
  }
}
```

- [ ] Run service and converter tests; expect PASS.

- [ ] **RED: test thin HTTP behavior.** Add controller tests asserting invalid input is 400, create is 201 with string micro-USD, list/get is 200, missing is 404, and delete invokes cancellation/artifact cleanup but never a local-source delete method.

- [ ] **GREEN: create strict transport validation and thin route/controller.**

```ts
export const CreateProjectApiSchema = z.object({ name:z.string().trim().min(1).max(200), mode:z.enum(['AI_HIGHLIGHTS','MANUAL']), language:z.string().regex(/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/u), maxClipSeconds:z.number().int().min(1).max(10800), platform:z.enum(['YOUTUBE_SHORTS','INSTAGRAM_REELS','TIKTOK']), source:z.discriminatedUnion('type',[z.object({type:z.literal('FILEPATH'),path:z.string().min(1)}).strict(),z.object({type:z.literal('UPLOAD'),fileName:z.string().min(1),sizeBytes:z.string().regex(/^\d+$/u)}).strict()]) }).strict();
export class ProjectController {
  constructor(private readonly createProject: CreateProjectService) {}
  async create(request: Request): Promise<Response> {
    const parsed = CreateProjectApiSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({code:'INVALID_PROJECT',issues:parsed.error.issues},{status:400});
    const result = await this.createProject.execute(createProjectApiToEntity(parsed.data));
    return Response.json(projectEntityToApi(result),{status:201});
  }
}
// apps/web/src/app/api/projects/route.ts
export async function POST(request: Request) { return projectsComposition().controller.create(request); }
```

`projectEntityToApi` returns a source presentation `{kind,displayLabel,health}` only. For a filepath, `displayLabel` is the basename derived from the submitted display path; it never serializes `displayPath` or `resolvedPath`. The raw submitted path is accepted only in the create/relink request and is available afterward solely through Task 8's authenticated worker locator endpoint.

- [ ] **REFACTOR:** add Prisma repository integration tests, Record↔Entity tests for every enum/null/timestamp/money field, and deletion transaction ordering. Verify repository files reference one Prisma model each and no API/Record type enters services.

## Broader verification

```bash
pnpm exec vitest run apps/web/src/modules/projects
pnpm exec vitest run tests/integration/database/core-schema.test.ts
pnpm test:architecture
pnpm typecheck
git diff --check
```

Expected: all pass; public handlers are thin; local filepath deletion is impossible through the cleanup port.

**Suggested commit:** `feat: add project persistence and public APIs`
