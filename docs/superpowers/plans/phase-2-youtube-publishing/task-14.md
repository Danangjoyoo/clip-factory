# Task 14: Publishing Controls, Independent Schedules, Progress, and Recovery UI

> **Implementation mode:** Complete after Tasks 5, 10, 12, and 13. This task turns the proven backend into explicit per-clip and selected-batch user flows.

## Purpose

Let users choose per-clip private review or verified scheduling, assign independent local date/time/IANA timezones, optionally generate a local cover, confirm selected uploads, follow per-clip progress, cancel/retry safely, and recover from reauth, upload failure, thumbnail warning, or `PAID_CALL_UNCERTAIN` without corrupting siblings.

## Requirements and traceability

- YouTube design §§5–6, 11–12: per-clip editor, explicit/batch confirmation, visibility/schedule, past/collision checks, private-first, unverified lockout, independent workflows.
- YouTube design §§14–16: progress/errors/cancel semantics, cover asset, honest Shorts thumbnail warning, sanitized recovery.
- YouTube design acceptance 6, 8–10, 13: three timezones, unverified private-only, offline schedules, isolated upload/thumbnail failure, uncertain paid call requires fresh authorization.
- Core UX: dark/mint accessible controls, visible status text/focus, reduced motion, measured progress.

## Clean Architecture ownership

- **Affected layers:** cover application/workflow boundary, public APIs, React publication editor/batch/progress view models/components, Phase 1 SSE projection adapter.
- **Business policy:** services call Task 2/12 policies; UI never decides whether a provider request is legal.
- **Cover boundary:** cover spec is a distinct Temporal DTO; worker local render activity creates a PNG object; publication snapshots the spec/object reference.
- **UI boundary:** presentation-only values/callbacks; no Prisma/Temporal/provider/object-store imports.

## Files

- Modify: `packages/contracts/schema/youtube-publishing.schema.json`
- Regenerate: `packages/contracts/src/generated/youtube-publishing.ts`
- Regenerate: `apps/worker/src/clip_factory/entrypoints/contracts/generated/youtube_publishing.py`
- Create: `prisma/migrations/20260712000500_phase_2_publication_cover/migration.sql`
- Modify: `prisma/schema.prisma`
- Modify: `apps/web/src/modules/youtube-publishing/application/dto/entity/youtube-publishing-entity.dto.ts`
- Modify: `apps/web/src/modules/youtube-publishing/application/ports/record/publication-record.dto.ts`
- Modify: `apps/web/src/modules/youtube-publishing/application/ports/publication.repository.ts`
- Modify: `apps/web/src/modules/youtube-publishing/adapters/persistence/repositories/prisma-publication.repository.ts`
- Create: `apps/web/src/modules/youtube-publishing/application/ports/publication-cover-workflow-scheduler.ts`
- Create: `apps/web/src/modules/youtube-publishing/application/services/generate-publication-cover.service.ts`
- Create: `apps/web/src/modules/youtube-publishing/application/services/generate-publication-cover.service.test.ts`
- Create: `apps/web/src/modules/youtube-publishing/application/services/start-publication-batch.service.ts`
- Create: `apps/web/src/modules/youtube-publishing/application/services/start-publication-batch.service.test.ts`
- Create: `apps/web/src/modules/youtube-publishing/delivery/http/publication-controls.controller.ts`
- Create: `apps/web/src/app/api/v1/clips/[clipId]/youtube/cover/route.ts`
- Create: `apps/web/src/app/api/v1/projects/[projectId]/youtube/publication-batches/route.ts`
- Create: `apps/web/src/app/api/v1/youtube/publications/[publicationId]/reconcile/route.ts`
- Create: `apps/web/src/app/api/v1/youtube/publications/[publicationId]/acknowledge-duplicate-risk/route.ts`
- Create: `apps/web/src/app/api/v1/projects/[projectId]/youtube/publication-events/route.ts`
- Create: `apps/web/src/modules/youtube-publishing/delivery/http/publication-controls.controller.test.ts`
- Create: `apps/web/src/modules/youtube-publishing/delivery/ui/publication-controls.vm.ts`
- Create: `apps/web/src/modules/youtube-publishing/delivery/ui/publication-controls.tsx`
- Create: `apps/web/src/modules/youtube-publishing/delivery/ui/publication-controls.test.tsx`
- Create: `apps/web/src/modules/youtube-publishing/delivery/ui/publication-progress-list.tsx`
- Create: `apps/web/src/modules/youtube-publishing/delivery/ui/publication-progress-list.test.tsx`
- Modify: `apps/web/src/modules/youtube-publishing/delivery/ui/youtube-workspace.tsx`
- Modify: `apps/web/src/modules/youtube-publishing/delivery/ui/publishing-metadata-editor.tsx`
- Create: `apps/worker/src/clip_factory/ports/youtube_publishing/publication_cover_generator.py`
- Create: `apps/worker/src/clip_factory/adapters/youtube/ffmpeg_publication_cover_generator.py`
- Create: `apps/worker/src/clip_factory/entrypoints/temporal/youtube_publishing/cover_workflow.py`
- Create: `apps/worker/src/clip_factory/entrypoints/temporal/youtube_publishing/cover_activities.py`
- Create: `apps/worker/tests/adapters/youtube/test_ffmpeg_publication_cover_generator.py`
- Create: `apps/worker/tests/entrypoints/temporal/youtube_publishing/test_cover_workflow.py`
- Modify: `apps/web/src/modules/youtube-publishing/composition/youtube-publishing.module.ts`
- Modify: `apps/worker/src/clip_factory/composition/worker_container.py`

## Prerequisites

- Task 10 approved draft/editor and Task 12 start/cancel/retry endpoints are green.
- Task 13 workspace rows/view preference are green.
- Phase 1 FFmpeg execution/object-store/progress/SSE adapters are reused through narrow ports.

## Interfaces

```ts
export type PublicationCoverSpecEntityDto = {
  selectedFrameMs: number;
  text: string | null;
  textPosition: 'TOP' | 'CENTER' | 'BOTTOM';
};

export type StartPublicationSelectionEntityDto = {
  clipId: ClipId;
  draftId: PublishingMetadataDraftId;
  visibility: PublicationVisibility;
  sourceLocalDateTime: string | null;
  sourceTimezone: string | null;
  collisionConfirmed: boolean;
  cover: {
    objectKey: string;
    spec: PublicationCoverSpecEntityDto;
  } | null;
};
```

Batch response contains one result per selected clip:

```ts
export type StartPublicationBatchSelectionEntityDto = Omit<
  StartYouTubePublicationInput,
  'projectId' | 'idempotencyKey' | 'confirmed'
>;

export type StartPublicationBatchInputEntityDto = {
  projectId: ProjectId;
  selections: readonly StartPublicationBatchSelectionEntityDto[];
  confirmed: boolean;
  batchIdempotencyKey: string;
};

export type StartPublicationBatchResultEntityDto = {
  results: readonly (
    | { clipId: ClipId; status: 'STARTED'; publicationId: PublicationId }
    | { clipId: ClipId; status: 'REJECTED'; safeErrorCode: string; safeMessage: string }
  )[];
};
```

## RED-GREEN-REFACTOR cycle 1: local cover generation and durable snapshot

- [ ] **RED 1.1 — Write cover policy/adapter tests first.**

Web service test:

```ts
it('accepts an in-range frame and schedules a token-free local cover workflow', async () => {
  const dependencies = makeCoverDependencies({ clipStartMs: 10_000, clipEndMs: 70_000 });
  const service = new GeneratePublicationCoverService(dependencies);
  const result = await service.generate({
    clipId: clipId('018f4f2c-93d7-7c75-8f0f-7f5165e8bb71'),
    renderId: renderId('018f4f2c-93d7-7c75-8f0f-7f5165e8bb72'),
    selectedFrameMs: 30_000,
    text: 'One useful idea',
    textPosition: 'BOTTOM',
  });
  expect(dependencies.scheduler.start).toHaveBeenCalledWith({
    contractVersion: 1,
    clipId: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb71',
    renderObjectKey: 'renders/clip-1/final.mp4',
    outputObjectKey: expect.stringMatching(/^covers\/clip-1\/[a-f0-9]{64}\.png$/),
    selectedFrameMs: 30_000,
    text: 'One useful idea',
    textPosition: 'BOTTOM',
  });
  expect(result.status).toBe('GENERATING');
});

it.each([
  [-1, 'selected frame is outside the rendered clip'],
  [60_001, 'selected frame is outside the rendered clip'],
])('rejects invalid relative frame %s', async (relativeFrameMs, message) => {
  const service = new GeneratePublicationCoverService(
    makeCoverDependencies({ clipStartMs: 10_000, clipEndMs: 70_000 }),
  );
  await expect(service.generate(makeCoverInput({ selectedFrameMs: 10_000 + relativeFrameMs })))
    .rejects.toThrow(message);
});
```

Worker adapter test asserts an argument array, never a shell string:

```python
def test_cover_command_selects_frame_and_escapes_text_without_shell() -> None:
    command = build_cover_command(make_cover_request(text="Don't shell $HOME"))
    assert command.executable == 'ffmpeg'
    assert command.shell is False
    assert command.arguments[:4] == ('-ss', '20.000', '-i', '/safe/render-input.mp4')
    assert command.arguments[-2:] == ('-frames:v', '1')
    assert '$HOME' in ' '.join(command.arguments)
```

Add worker tests for no text, TOP/CENTER/BOTTOM positions, PNG output <=2,000,000 bytes, deterministic object key/spec hash, object-store write, and sanitized FFmpeg failure.

- [ ] **RED 1.2 — Witness missing cover services/adapters.**

```bash
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/application/services/generate-publication-cover.service.test.ts
uv run --directory apps/worker pytest tests/adapters/youtube/test_ffmpeg_publication_cover_generator.py tests/entrypoints/temporal/youtube_publishing/test_cover_workflow.py -q
```

Expected RED: cover service/workflow signature shells collect; a valid frame request returns `NOT_IMPLEMENTED:publication-cover` instead of a deterministic PNG object reference under `covers/<clipId>/`.

- [ ] **GREEN 1.3 — Implement cover contract, workflow, and publication columns.**

Add closed `publicationCoverWorkflowInputV1/resultV1` definitions. The web service validates frame bounds/text at most 80 code points/no control characters, hashes the normalized spec for deterministic `covers/<clipId>/<sha256>.png`, and schedules a local workflow. Worker activity gets the render through Phase 1 object-store/file adapter, invokes FFmpeg as an argument array to extract the selected frame and optional local application font text, compresses PNG under 2 MB, stores it, and reports object reference/dimensions/size. No OpenAI call occurs.

Add migration:

```sql
alter table "publications"
  add column "cover_object_key" text,
  add column "cover_spec_snapshot" jsonb,
  add constraint "publications_cover_tuple_check" check (
    ("cover_object_key" is null and "cover_spec_snapshot" is null) or
    ("cover_object_key" is not null and jsonb_typeof("cover_spec_snapshot") = 'object')
  );
```

Map fields through Publication Record/Entity converters. Task 12 start snapshots a completed cover only; pending/failed cover cannot be passed to upload. Run focused tests/migration. Expected GREEN: PASS.

- [ ] **REFACTOR 1.4 — Reuse stable Phase 1 media primitives only.**

Do not create a second FFmpeg runner, object-store client, font catalog, or command sanitizer. Add architecture/import assertions that the cover adapter depends on Phase 1 ports/public helpers, not concrete media adapters, and rerun.

```python
@pytest.mark.parametrize(
    'forbidden_import',
    [
        'clip_factory.adapters.media.ffmpeg_runner',
        'clip_factory.adapters.object_store.minio_client',
    ],
)
def test_cover_adapter_rejects_concrete_media_imports(forbidden_import: str) -> None:
    source = inspect.getsource(ffmpeg_publication_cover_generator)
    assert forbidden_import not in source
```

```bash
uv run --directory apps/worker pytest tests/adapters/youtube/test_ffmpeg_publication_cover_generator.py -q
uv run --directory apps/worker lint-imports
```

## RED-GREEN-REFACTOR cycle 2: schedule/private controls and collision confirmation

- [ ] **RED 2.1 — Write component tests first.**

Create `publication-controls.test.tsx`:

```tsx
it('locks scheduling for an unverified API project and explains private review', () => {
  render(<PublicationControls viewModel={makePublicationControlsVm({ apiProjectVerified: false })} />);
  expect(screen.getByRole('radio', { name: 'Schedule on YouTube' })).toBeDisabled();
  expect(screen.getByText(/unverified API projects are restricted to private uploads/)).toBeVisible();
  expect(screen.getByText(/review or publish later in YouTube Studio/)).toBeVisible();
});

it('submits local date time and IANA timezone as independent values', async () => {
  const onSubmit = vi.fn();
  render(<PublicationControls
    viewModel={makePublicationControlsVm({ apiProjectVerified: true })}
    onSubmit={onSubmit}
  />);
  await user.click(screen.getByRole('radio', { name: 'Schedule on YouTube' }));
  await user.type(screen.getByLabelText('Publication date and time'), '2026-07-12T09:30');
  await user.selectOptions(screen.getByLabelText('Timezone'), 'Asia/Tokyo');
  await user.click(screen.getByRole('button', { name: 'Review upload' }));
  expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
    visibility: 'SCHEDULED',
    sourceLocalDateTime: '2026-07-12T09:30:00',
    sourceTimezone: 'Asia/Tokyo',
  }));
});

it('requires confirmation for an intentional close schedule', async () => {
  render(<PublicationControlsHarness existingUtcInstants={['2026-07-12T00:30:00Z']} />);
  await fillSchedule('2026-07-12T09:33', 'Asia/Tokyo');
  await user.click(screen.getByRole('button', { name: 'Review upload' }));
  expect(screen.getByRole('dialog', { name: 'Schedule close to another clip?' })).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Keep both schedules' }));
  expect(lastSubmittedSelection()).toMatchObject({ collisionConfirmed: true });
});
```

Append these exact edge cases:

```tsx
it.each([
  ['2026-07-10T09:30', 'Asia/Tokyo', 'Publication time must be in the future.'],
  ['2026-03-08T02:30', 'America/New_York', 'That local time does not exist in this timezone.'],
  ['2026-11-01T01:30', 'America/New_York', 'Choose which UTC offset this local time means.'],
  ['2026-07-12T09:30', '', 'Select a timezone.'],
] as const)('shows the schedule error for %s in %s', async (local, zone, message) => {
  render(<PublicationControlsHarness />);
  await fillSchedule(local, zone);
  await user.click(screen.getByRole('button', { name: 'Review upload' }));
  expect(screen.getByText(message)).toBeVisible();
});

it('keeps independent timezone choices for three clip rows', async () => {
  render(<ThreePublicationControlsHarness />);
  await fillRowSchedule('clip-1', '2026-08-01T09:30', 'Asia/Tokyo');
  await fillRowSchedule('clip-2', '2026-08-01T09:30', 'America/New_York');
  await fillRowSchedule('clip-3', '2026-08-01T09:30', 'UTC');
  expect(readRowZones()).toEqual(['Asia/Tokyo', 'America/New_York', 'UTC']);
});
```

- [ ] **RED 2.2 — Witness missing controls.**

```bash
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/delivery/ui/publication-controls.test.tsx
```

Expected RED: component/view-model shells render; `getByRole('radio', { name: 'Schedule on YouTube' })` fails because the schedule control is not yet present.

- [ ] **GREEN 2.3 — Implement controlled schedule form.**

Use native radio/date-time/select controls, `Intl.supportedValuesOf('timeZone')` sorted with current system zone first, Task 2 normalization via server estimate endpoint, and explicit collision dialog. Private review clears schedule fields. Every submit opens a final dialog showing clip/title/channel/visibility/local time/timezone/UTC/thumbnail caveat and requires `Upload private video` or `Schedule private video` confirmation.

UI disables upload when connection is unhealthy, worker offline, render ineligible, draft unapproved, cover pending, or another workflow active, and displays the corresponding text reason.

```tsx
const timeZones = [
  viewModel.systemTimezone,
  ...Intl.supportedValuesOf('timeZone').filter((zone) => zone !== viewModel.systemTimezone).sort(),
];

<fieldset>
  <legend>Visibility</legend>
  <label><input type="radio" name="visibility" value="PRIVATE_REVIEW" />Private review</label>
  <label>
    <input
      type="radio"
      name="visibility"
      value="SCHEDULED"
      disabled={!viewModel.apiProjectVerified}
    />
    Schedule on YouTube
  </label>
</fieldset>
<input type="datetime-local" aria-label="Publication date and time" value={localDateTime} onChange={onLocalChange} />
<select aria-label="Timezone" value={timezone} onChange={onTimezoneChange}>
  {timeZones.map((zone) => <option key={zone} value={zone}>{zone}</option>)}
</select>
```

```bash
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/delivery/ui/publication-controls.test.tsx
```

Expected GREEN: PASS.

- [ ] **REFACTOR 2.4 — Keep legality server-authoritative.**

Add a component test that maliciously supplies enabled scheduled controls for an unverified VM, submits, and receives server `UNVERIFIED_PRIVATE_ONLY`; show the safe error and no optimistic success. Rerun component and Task 12 service tests.

```tsx
it('shows the server denial when a malicious VM enables scheduling', async () => {
  const onSubmit = vi.fn().mockRejectedValue({
    code: 'UNVERIFIED_PRIVATE_ONLY',
    safeMessage: 'Unverified API projects support private review only.',
  });
  render(<PublicationControlsHarness apiProjectVerified={false} forceScheduleEnabled onSubmit={onSubmit} />);
  await fillSchedule('2026-07-12T09:30', 'Asia/Tokyo');
  await user.click(screen.getByRole('button', { name: 'Review upload' }));
  await user.click(screen.getByRole('button', { name: 'Schedule private video' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('private review only');
  expect(screen.queryByText('Upload started')).not.toBeInTheDocument();
});
```

```bash
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/delivery/ui/publication-controls.test.tsx src/modules/youtube-publishing/application/services/start-youtube-publication.service.test.ts
```

## RED-GREEN-REFACTOR cycle 3: selected batches and independent results

- [ ] **RED 3.1 — Write batch service/UI tests.**

Application test:

```ts
it('starts only explicitly selected clips and returns per-clip outcomes', async () => {
  const service = new StartPublicationBatchService(makeBatchDependencies({
    results: {
      'clip-1': { status: 'STARTED', publicationId: 'publication-1' },
      'clip-3': { status: 'REJECTED', safeErrorCode: 'DRAFT_NOT_APPROVED' },
    },
  }));
  const result = await service.start({
    projectId: projectId('project-1'),
    selections: [makeSelection('clip-1'), makeSelection('clip-3')],
    confirmed: true,
    batchIdempotencyKey: 'batch:project-1:1',
  });
  expect(result.results.map((item) => item.clipId)).toEqual(['clip-1', 'clip-3']);
  expect(startPublication).not.toHaveBeenCalledWith(expect.objectContaining({ clipId: 'clip-2' }));
});
```

UI test:

```tsx
it('confirms the exact selected clips and preserves sibling success', async () => {
  render(<YouTubeWorkspaceHarness clips={makeThreePublishableClips()} />);
  await user.click(screen.getByRole('checkbox', { name: 'Select clip One' }));
  await user.click(screen.getByRole('checkbox', { name: 'Select clip Three' }));
  await user.click(screen.getByRole('button', { name: 'Upload 2 selected clips' }));
  const dialog = screen.getByRole('dialog', { name: 'Confirm 2 YouTube uploads' });
  expect(within(dialog).getByText('One')).toBeVisible();
  expect(within(dialog).getByText('Three')).toBeVisible();
  expect(within(dialog).queryByText('Two')).not.toBeInTheDocument();
  await user.click(within(dialog).getByRole('button', { name: 'Start 2 uploads' }));
  publishEvents.emit({ clipId: 'clip-1', state: 'PRIVATE_REVIEW' });
  publishEvents.emit({ clipId: 'clip-3', state: 'FAILED', safeMessage: 'Upload rejected.' });
  expect(screen.getByText('One uploaded privately')).toBeVisible();
  expect(screen.getByText('Three failed: Upload rejected.')).toBeVisible();
});
```

- [ ] **RED 3.2 — Witness missing batch/progress behavior.**

```bash
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/application/services/start-publication-batch.service.test.ts src/modules/youtube-publishing/delivery/ui/youtube-workspace.test.tsx src/modules/youtube-publishing/delivery/ui/publication-progress-list.test.tsx
```

Expected RED: batch/progress shells collect and render; starting clips 1 and 3 returns an empty outcomes array instead of independent `STARTED`/`REJECTED` results.

- [ ] **GREEN 3.3 — Implement per-item orchestration and SSE projection.**

Batch service validates project membership/no duplicate clip IDs/`confirmed`, then invokes Task 12 start independently for each selection with item idempotency key `<batchKey>:<clipId>`. It collects typed results; one rejection never short-circuits siblings. Batch route returns `207 Multi-Status` when mixed, `202` when all start, and never rolls back started siblings.

Publication event endpoint reuses Phase 1 authenticated localhost SSE infrastructure and Redis rebuildable projection; durable state always comes from PostgreSQL on reconnect. Progress list shows stage, measured upload bytes/percent, YouTube processing percent when known, and no fake ETA. It reconnects with last event ID and refreshes durable workspace state after disconnect.

```ts
const results = await Promise.all(input.selections.map(async (selection) => {
  try {
    const publication = await this.startPublication.start({
      ...selection,
      projectId: input.projectId,
      idempotencyKey: `${input.batchIdempotencyKey}:${selection.clipId}`,
      confirmed: true,
    });
    return { clipId: selection.clipId, status: 'STARTED' as const, publicationId: publication.id };
  } catch (error) {
    return { clipId: selection.clipId, status: 'REJECTED' as const, ...toSafeBatchError(error) };
  }
}));
return { results };
```

The controller—not the service DTO—returns `202` when every `results` item is `STARTED`, otherwise `207`.

```tsx
usePublicationEvents({
  projectId,
  lastEventId,
  onEvent: (event) => setItems((current) => applyMonotonicProgressEvent(current, event)),
  onReconnect: () => void refreshWorkspaceFromDatabase(),
});
```

```bash
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/application/services/start-publication-batch.service.test.ts src/modules/youtube-publishing/delivery/ui/youtube-workspace.test.tsx src/modules/youtube-publishing/delivery/ui/publication-progress-list.test.tsx
```

Expected GREEN: PASS.

- [ ] **REFACTOR 3.4 — Keep selection and event state local/presentation-only.**

Store selection in React state, not localStorage. Append these exact regression assertions:

```tsx
it('clears selection after remount and ignores stale SSE sequence numbers', () => {
  const first = render(<YouTubeWorkspace viewModel={workspace} />);
  selectClip('clip-1');
  first.unmount();
  render(<YouTubeWorkspace viewModel={workspace} />);
  expect(screen.getByRole('checkbox', { name: 'Select clip One' })).not.toBeChecked();
  publishEvents.emit({ publicationId: 'publication-1', sequence: 8, progressPercent: 80 });
  publishEvents.emit({ publicationId: 'publication-1', sequence: 7, progressPercent: 70 });
  expect(screen.getByText('80% uploaded')).toBeVisible();
});

it('rebuilds Redis-loss projection from PostgreSQL on reconnect', async () => {
  projection.clear();
  publications.findWorkspace.mockResolvedValue(workspaceWithProgress(64));
  await eventEndpoint.reconnect({ lastEventId: 'missing-9' });
  expect(projection.current('publication-1')?.progressPercent).toBe(64);
});
```

```bash
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/delivery/ui/youtube-workspace.test.tsx src/modules/youtube-publishing/delivery/ui/publication-progress-list.test.tsx
```

## RED-GREEN-REFACTOR cycle 4: cancellation, retry, warnings, and uncertain paid-call recovery

- [ ] **RED 4.1 — Write recovery UI tests.**

```tsx
it('explains cancellation before and after a YouTube video ID', async () => {
  const { rerender } = render(<PublicationProgressList items={[
    makeProgressItem({ state: 'UPLOADING', youtubeVideoId: null }),
  ]} />);
  await user.click(screen.getByRole('button', { name: 'Cancel upload' }));
  expect(screen.getByText(/stop the resumable upload where possible/)).toBeVisible();
  rerender(<PublicationProgressList items={[
    makeProgressItem({ state: 'YOUTUBE_PROCESSING', youtubeVideoId: 'video-safe-1' }),
  ]} />);
  await user.click(screen.getByRole('button', { name: 'Stop local tracking' }));
  expect(screen.getByText(/will not delete the video from YouTube/)).toBeVisible();
});

it('offers retry only for failed publication and keeps the same remote intent', async () => {
  const onRetry = vi.fn();
  render(<PublicationProgressList
    items={[makeProgressItem({ state: 'FAILED', attemptNumber: 1 })]}
    onRetry={onRetry}
  />);
  await user.click(screen.getByRole('button', { name: 'Retry failed upload' }));
  expect(onRetry).toHaveBeenCalledWith(expect.objectContaining({
    publicationId: expect.any(String),
    expectedAttemptNumber: 1,
  }));
});

it('shows thumbnail warning without marking upload failed', () => {
  render(<PublicationProgressList items={[makeProgressItem({
    state: 'PRIVATE_REVIEW',
    thumbnailWarning: 'YouTube did not accept the cover image.',
  })]} />);
  expect(screen.getByText('Uploaded privately')).toBeVisible();
  expect(screen.getByText(/Shorts do not support custom thumbnails like long-form uploads/)).toBeVisible();
  expect(screen.getByText('YouTube did not accept the cover image.')).toBeVisible();
});

it('does not offer automatic metadata retry in PAID_CALL_UNCERTAIN', () => {
  render(<YouTubeWorkspace viewModel={makeWorkspaceVm({
    metadataGenerationState: 'PAID_CALL_UNCERTAIN',
    possibleSpendLabel: 'Up to $0.050000 may have been spent.',
  })} />);
  expect(screen.queryByRole('button', { name: 'Retry metadata generation' })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Review possible spend and authorize a new attempt' })).toBeVisible();
});

it('reconciles an unknown final upload before enabling duplicate-risk acknowledgement', async () => {
  const onReconcile = vi.fn();
  const onAcknowledgeDuplicateRisk = vi.fn();
  const { rerender } = render(<PublicationProgressList
    items={[makeProgressItem({
      state: 'UPLOAD_OUTCOME_UNCERTAIN',
      reconciliationResult: null,
    })]}
    onReconcile={onReconcile}
    onAcknowledgeDuplicateRisk={onAcknowledgeDuplicateRisk}
  />);
  expect(screen.getByText(/YouTube may have created the video, but Clip Factory did not receive its ID/)).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Start a replacement upload' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Check the connected channel' }));
  expect(onReconcile).toHaveBeenCalledOnce();
  rerender(<PublicationProgressList
    items={[makeProgressItem({
      state: 'UPLOAD_OUTCOME_UNCERTAIN',
      reconciliationResult: 'NO_MATCH_FOUND',
    })]}
    onReconcile={onReconcile}
    onAcknowledgeDuplicateRisk={onAcknowledgeDuplicateRisk}
  />);
  await user.click(screen.getByRole('button', { name: 'Consider a replacement upload' }));
  const checkbox = screen.getByRole('checkbox', {
    name: 'I understand a duplicate YouTube video may already exist',
  });
  expect(screen.getByRole('button', { name: 'Acknowledge risk and start replacement' })).toBeDisabled();
  await user.click(checkbox);
  await user.click(screen.getByRole('button', { name: 'Acknowledge risk and start replacement' }));
  expect(onAcknowledgeDuplicateRisk).toHaveBeenCalledWith(expect.objectContaining({
    duplicateRiskAcknowledged: true,
    expectedAttemptNumber: 1,
  }));
});
```

- [ ] **RED 4.2 — Witness missing recovery states.**

Run the exact component set:

```bash
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/delivery/ui/publication-controls.test.tsx src/modules/youtube-publishing/delivery/ui/publication-progress-list.test.tsx src/modules/youtube-publishing/delivery/ui/youtube-workspace.test.tsx
```

Expected RED: `getByRole('button', { name: 'Check the connected channel' })` fails because the uncertainty recovery action is not rendered; no test may fail from an unresolved import.

- [ ] **GREEN 4.3 — Implement explicit recovery actions.**

Cancel uses Task 12 endpoint and confirmation text based on remote ID. Ordinary retry is enabled only for `FAILED`; it appends a bounded attempt under the same Publication after safe pre-final expiry/failure. `UPLOAD_OUTCOME_UNCERTAIN` has no ordinary retry: Reconcile calls the dedicated endpoint and shows `VIDEO_FOUND`, `NO_MATCH_FOUND`, or `INCONCLUSIVE`. `VIDEO_FOUND` attaches the remote identity and can never expose replacement. Only `NO_MATCH_FOUND` or `INCONCLUSIVE` exposes the acknowledged-risk replacement path. The replacement endpoint requires `{ expectedAttemptNumber, duplicateRiskAcknowledged: true, confirmed: true }`, persists acknowledgement, and warns that a duplicate remote video may already exist. `REAUTH_REQUIRED` shows reconnect action and resumes only after connection signal. Thumbnail warning stays secondary to success. `PAID_CALL_UNCERTAIN` links to Task 10's possible-spend acknowledgement/new reservation; it cannot invoke the old generation request.

```tsx
it('never offers replacement after reconciliation finds the remote video', () => {
  render(<PublicationProgressList items={[makeProgressItem({
    state: 'UPLOAD_OUTCOME_UNCERTAIN',
    reconciliationResult: 'VIDEO_FOUND',
    youtubeVideoId: 'video-safe-1',
  })]} />);
  expect(screen.getByText('The uploaded video was found on the connected channel.')).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Consider a replacement upload' }))
    .not.toBeInTheDocument();
});
```

```tsx
if (item.state === 'UPLOAD_OUTCOME_UNCERTAIN') {
  const replacementEligible = item.reconciliationResult === 'NO_MATCH_FOUND'
    || item.reconciliationResult === 'INCONCLUSIVE';
  return (
    <section aria-label={`Recovery for ${item.title}`}>
      <p role="status">Upload result unknown</p>
      <button onClick={() => onReconcile(item.publicationId)}>Check the connected channel</button>
      {item.reconciliationResult === 'VIDEO_FOUND' && (
        <p>The uploaded video was found on the connected channel.</p>
      )}
      {replacementEligible && (
        <button onClick={() => setReplacementDialog(item.publicationId)}>
          Consider a replacement upload
        </button>
      )}
    </section>
  );
}
```

```ts
await controls.acknowledgeDuplicateRisk({
  publicationId: parsePublicationId(request.params.publicationId),
  expectedAttemptNumber: body.expectedAttemptNumber,
  duplicateRiskAcknowledged: body.duplicateRiskAcknowledged,
  confirmed: body.confirmed,
});
```

```bash
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/delivery/ui/publication-progress-list.test.tsx src/modules/youtube-publishing/delivery/http/publication-controls.controller.test.ts
```

Expected GREEN: PASS.

- [ ] **REFACTOR 4.4 — Use exhaustive presentation mapping.**

Create one `Record<PublishingUiState, PublicationActionVm>` covering `DISCONNECTED`, `REAUTH_REQUIRED`, `METADATA_EMPTY`, `METADATA_DRAFT`, `AWAITING_APPROVAL`, `READY_TO_UPLOAD`, `UPLOADING`, `UPLOAD_OUTCOME_UNCERTAIN`, `YOUTUBE_PROCESSING`, `PRIVATE_REVIEW`, `SCHEDULED`, `PUBLISHED`, `FAILED`, `CANCELLED`, and `PAID_CALL_UNCERTAIN`. Add a test comparing enum keys to map keys; no default branch. Rerun.

## Broader verification

- [ ] Run:

```bash
pnpm prisma:generate
pnpm db:migrate:deploy
pnpm test:contracts
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/application/services/generate-publication-cover.service.test.ts src/modules/youtube-publishing/application/services/start-publication-batch.service.test.ts src/modules/youtube-publishing/delivery/ui/publication-controls.test.tsx src/modules/youtube-publishing/delivery/ui/publication-progress-list.test.tsx src/modules/youtube-publishing/delivery/ui/youtube-workspace.test.tsx
uv run --directory apps/worker pytest tests/adapters/youtube/test_ffmpeg_publication_cover_generator.py tests/entrypoints/temporal/youtube_publishing/test_cover_workflow.py -q
pnpm test:integration
pnpm test:architecture
pnpm test:coverage
pnpm typecheck
pnpm format:check
git diff --check
```

- [ ] Confirm three clips keep three source timezones/UTC instants and three workflows.
- [ ] Confirm unverified UI and server can express only private review.
- [ ] Confirm mixed batches preserve successful siblings, thumbnail warning preserves success, `PAID_CALL_UNCERTAIN` never retries/overwrites automatically, and `UPLOAD_OUTCOME_UNCERTAIN` never starts a replacement before reconciliation plus explicit duplicate-risk acknowledgement.

## Review gate

Approve only when cover generation remains local, schedules are independent and server-authoritative, selected batch confirmation is exact, progress is measured/reconnectable, retry/cancel semantics match remote identity, warnings stay warnings, and paid-call uncertainty requires fresh explicit authorization.

## Suggested commit

```text
feat(youtube): add publishing controls and recovery UI
```
