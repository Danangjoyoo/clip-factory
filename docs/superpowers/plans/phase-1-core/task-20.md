# Task 20: Manual Add Clip in Both Project Modes

> **For agentic workers:** Use superpowers:test-driven-development. The first test must prove the OpenAI port is unreachable from this use case.

## Purpose and traceability

Implement design §16 and acceptance criterion 5: precise manual ranges, local transcript cue copy, local reframe/preview preparation, MANUAL provenance, and exactly zero OpenAI cost.

## Boundaries and files

- Requires Tasks 7, 12, and 18–19.
- Create: `apps/web/src/modules/clips/application/dto/entity/clip-entity.dto.ts`
- Create: `apps/web/src/modules/clips/application/dto/entity/index.ts`
- Create: `apps/web/src/modules/clips/application/ports/clip.repository.ts`
- Reuse: `apps/web/src/modules/clips/application/ports/clip-preparation.port.ts`
- Create: `apps/web/src/modules/clips/application/ports/transcript-document.port.ts`
- Create: `apps/web/src/modules/clips/application/data-services/clip.data-service.ts`
- Create: `apps/web/src/modules/clips/application/services/add-manual-clip.service.ts`
- Create: `apps/web/src/modules/clips/adapters/persistence/dto/record/clip-record.dto.ts`
- Create: `apps/web/src/modules/clips/adapters/persistence/repositories/prisma-clip.repository.ts`
- Create: `apps/web/src/modules/clips/adapters/clients/temporal/temporal-clip-preparation.adapter.ts`
- Create: `apps/web/src/modules/clips/delivery/http/dto/api/add-clip-api.dto.ts`
- Create: `apps/web/src/modules/clips/delivery/http/clip.controller.ts`
- Create: `apps/web/src/modules/clips/converters/api-entity/add-clip.converter.ts`
- Create: `apps/web/src/modules/clips/adapters/persistence/converters/clip.converter.ts`
- Create: `apps/web/src/modules/clips/composition/clips.composition.ts`
- Create: `apps/web/src/modules/clips/testing/manual-clip-harness.ts`
- Create: `apps/web/src/app/api/projects/[projectId]/clips/route.ts`
- Test: `apps/web/src/modules/clips/application/services/add-manual-clip.service.test.ts`
- Test: `apps/web/src/modules/clips/converters/api-entity/add-clip.converter.test.ts`
- Test: `apps/web/src/modules/clips/adapters/persistence/converters/clip.converter.test.ts`
- Test: `apps/web/src/modules/clips/adapters/persistence/repositories/prisma-clip.repository.test.ts`
- Test: `apps/web/src/modules/clips/delivery/http/clip.controller.test.ts`
- Test: `tests/integration/clips/manual-add.test.ts`
- Service imports project/transcript data services and clip preparation port, never an analysis/OpenAI port.

## RED → GREEN → REFACTOR

- [ ] **RED: successful behavior and zero-cost dependency graph.**

```ts
it.each(['MANUAL', 'AI_HIGHLIGHTS'] as const)('adds a zero-cost manual clip to %s project', async (mode) => {
  const h = manualClipHarness({ mode, sourceDurationMs: 120000, maximumClipSeconds: 60 });
  const result = await h.service.execute({ projectId: h.projectId, startTimecode: '00:00:10.000', endTimecode: '00:00:40.000' });
  expect(result).toMatchObject({ origin: 'MANUAL', startMs: 10000, endMs: 40000, analysisRunId: null, rank: null, score: null, selectionCostMicrousd: 0n });
  expect(result.captionDocument.cues.flatMap((cue) => cue.words).map((word) => word.text)).toEqual(['first', 'complete', 'thought']);
  expect(h.preparation.calls).toEqual([{ clipId: result.id, startMs: 10000, endMs: 40000 }]);
  expect(Object.keys(h.dependencies)).not.toContain('openAI');
});
```

- [ ] Create compile-safe Entity-only ports/DTOs and an `AddManualClipService.execute` shell returning a MANUAL clip with an empty caption and no preparation call; verify typecheck passes, then run the test; expect the named caption/preparation assertion to FAIL while imports pass.

- [ ] **GREEN: create the service with explicit request/result.**

```ts
export class AddManualClipService {
  constructor(
    private readonly projects: ProjectDataService,
    private readonly sources: SourceAssetDataService,
    private readonly transcripts: TranscriptDocumentPort,
    private readonly clips: ClipDataService,
    private readonly preparation: ClipPreparationPort,
  ) {}
  async execute(input: AddManualClipEntityRequest): Promise<ClipEntityDto> {
    const project = await this.projects.requireById(input.projectId);
    const source = await this.sources.requireByProjectId(project.id);
    const sourceDurationMs = requireHealthyProbe(source).durationMs;
    const startMs = parseTimecode(input.startTimecode);
    const endMs = parseTimecode(input.endTimecode);
    if (endMs <= startMs) throw new ClipError('CLIP_END_NOT_AFTER_START');
    if (endMs > sourceDurationMs) throw new ClipError('CLIP_OUTSIDE_SOURCE');
    if (endMs - startMs > project.defaultMaxClipSeconds * 1000) throw new ClipError('CLIP_TOO_LONG');
    const words = await this.transcripts.wordsInRange(project.id, startMs, endMs);
    const clip = await this.clips.createManual({ projectId: project.id, startMs, endMs, captionDocument: buildCaptionDocument(words, startMs, endMs) });
    await this.preparation.prepare({ projectWorkflowId: project.activeWorkflowId, clipId: clip.id, startMs, endMs });
    return clip;
  }
}
```

`selectionCostMicrousd` is a read-model field derived as `0n` when `analysisRunId` is null; it is not duplicated in the `clips` table. AI clip selection cost is derived from Task 16 allocations.

- [ ] Run `pnpm exec vitest run apps/web/src/modules/clips/application/services/add-manual-clip.service.test.ts`; expect PASS.

- [ ] **RED: table-test invalid ordering, equal bounds, source overflow, max-length overflow, missing transcript, unknown project, malformed timecode, and duplicate idempotency key.** Assert 422/404/409 API mapping and no clip/preparation calls.

- [ ] **GREEN:** in `add-clip-api.dto.ts`, `add-clip.converter.ts`, `clip.controller.ts`, and `prisma-clip.repository.ts`, add strict Zod schema `{start:string,end:string}`, API→Entity conversion, required UUID idempotency key, a one-service controller, and the Prisma transaction. Duplicate-identical returns the original clip; duplicate-different returns conflict. Run `pnpm exec vitest run apps/web/src/modules/clips/delivery/http/clip.controller.test.ts apps/web/src/modules/clips/adapters/persistence/repositories/prisma-clip.repository.test.ts`; expect PASS.

```bash
# GREEN attachment: implement the exact files/functions named above.
pnpm exec vitest run apps/web/src/modules/clips/application/services/add-manual-clip.service.test.ts apps/web/src/modules/clips/converters
# Expected: PASS
```

- [ ] **REFACTOR:** the Temporal `ClipPreparationPort` adapter sends Task 13 `prepare_manual_clip` to the live project workflow. Adapter-private Entity↔Record tests assert MANUAL enum, null analysis/rank/score, JSON document validation, and UTC timestamps; `selectionCostMicrousd` is asserted only in the read-model/service result as derived `0n` and is absent from `ClipRecordDto` and the `clips` schema. Architecture scanner rejects any Record DTO/persistence converter or analysis client import in the manual service. Re-run `pnpm exec vitest run apps/web/src/modules/clips/application/services/add-manual-clip.service.test.ts apps/web/src/modules/clips/adapters/persistence apps/web/src/modules/clips/delivery/http/clip.controller.test.ts && pnpm test:architecture`; expect PASS.

```bash
# REFACTOR attachment: implement the exact files/functions named above.
pnpm exec vitest run apps/web/src/modules/clips/application/services/add-manual-clip.service.test.ts apps/web/src/modules/clips/converters
# Expected: PASS
```

## Verification and commit

```bash
pnpm exec vitest run apps/web/src/modules/clips/application/services/add-manual-clip.service.test.ts apps/web/src/modules/clips/converters
pnpm exec vitest run tests/integration/clips/manual-add.test.ts
pnpm test:architecture
git diff --check
```

Expected: both modes add locally prepared clips and durable OpenAI usage remains exactly zero.

**Suggested commit:** `feat: add zero-cost manual clips`
