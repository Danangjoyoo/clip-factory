# Task 10: Metadata Editor, Manual Drafts, Versioning, and Approval

> **Implementation mode:** Complete after Tasks 4 and 9. This task never uploads; it makes one exact draft revision eligible for Task 12.

## Purpose

Provide manual zero-cost metadata creation, safe editing of generated/manual versions, visible provenance/history, regeneration confirmation, and explicit approval of a validated immutable revision. No approved fields are overwritten by generation or stale browser edits.

## Requirements and traceability

- YouTube design §§5–6: all editable fields, manual zero cost, provenance, no silent overwrite, regeneration version history, policy limits, explicit review.
- YouTube design §§11, 13–14: upload requires approved metadata and snapshots the approved fields.
- Testing/acceptance: manual edit/approval Playwright, generation separately costed, publish impossible before approval.

## Clean Architecture ownership

- **Affected layers:** application approval/version service, public HTTP API/converters, React editor/view model.
- **Uses:** Task 4 draft data service, Task 9 generation service, Task 2 metadata policy, Phase 1 unit-of-work/idempotency.
- **DTO boundaries:** API request/response, Entity draft/metadata, Record persistence, and UI form/view model remain distinct.
- **UI rule:** component receives presentation-ready state/callbacks and does not import services, Entity DTOs, Prisma, OpenAI, or Temporal.

## Files

- Create: `prisma/migrations/20260712000400_phase_2_metadata_approval/migration.sql`
- Modify: `prisma/schema.prisma`
- Create: `apps/web/src/modules/youtube-publishing/application/services/manage-publishing-metadata.service.ts`
- Create: `apps/web/src/modules/youtube-publishing/application/services/manage-publishing-metadata.service.test.ts`
- Modify: `apps/web/src/modules/youtube-publishing/application/ports/publishing-metadata-draft.repository.ts`
- Modify: `apps/web/src/modules/youtube-publishing/adapters/persistence/repositories/prisma-publishing-metadata-draft.repository.ts`
- Modify: `apps/web/src/modules/youtube-publishing/application/data-services/publishing-metadata-draft.data-service.ts`
- Create: `apps/web/src/modules/youtube-publishing/delivery/http/dto/api/publishing-metadata-api.dto.ts`
- Create: `apps/web/src/modules/youtube-publishing/converters/api-entity/publishing-metadata.converter.ts`
- Create: `apps/web/src/modules/youtube-publishing/converters/api-entity/publishing-metadata.converter.test.ts`
- Create: `apps/web/src/modules/youtube-publishing/delivery/http/publishing-metadata.controller.ts`
- Create: `apps/web/src/app/api/v1/clips/[clipId]/youtube/metadata-drafts/route.ts`
- Create: `apps/web/src/app/api/v1/clips/[clipId]/youtube/metadata-drafts/[draftId]/route.ts`
- Create: `apps/web/src/app/api/v1/clips/[clipId]/youtube/metadata-drafts/[draftId]/approve/route.ts`
- Create: `apps/web/src/modules/youtube-publishing/delivery/http/publishing-metadata.controller.test.ts`
- Create: `apps/web/src/modules/youtube-publishing/delivery/ui/publishing-metadata-editor.vm.ts`
- Create: `apps/web/src/modules/youtube-publishing/delivery/ui/publishing-metadata-editor.tsx`
- Create: `apps/web/src/modules/youtube-publishing/delivery/ui/publishing-metadata-editor.module.css`
- Create: `apps/web/src/modules/youtube-publishing/delivery/ui/publishing-metadata-editor.test.tsx`
- Modify: `apps/web/src/modules/youtube-publishing/composition/youtube-publishing.module.ts`

## Prerequisites

- Task 4 draft versions/revisions and Task 9 generation result are green.
- Task 2 metadata policy is the only limit implementation.
- Existing Phase 1 form, dialog, error-summary, and design-token patterns are reused.

## Interfaces

```ts
export type SavePublishingMetadataEntityInput = {
  clipId: ClipId;
  draftId: PublishingMetadataDraftId;
  expectedRevision: number;
  metadata: PublishingMetadataEntityDto;
};

export interface ManagePublishingMetadataServiceContract {
  list(clipId: ClipId): Promise<readonly PublishingMetadataDraftEntityDto[]>;
  createManual(input: {
    projectId: ProjectId;
    clipId: ClipId;
    metadata: PublishingMetadataEntityDto;
    idempotencyKey: string;
  }): Promise<PublishingMetadataDraftEntityDto>;
  save(input: SavePublishingMetadataEntityInput): Promise<PublishingMetadataDraftEntityDto>;
  approve(input: {
    clipId: ClipId;
    draftId: PublishingMetadataDraftId;
    expectedRevision: number;
  }): Promise<PublishingMetadataDraftEntityDto>;
}
```

## RED-GREEN-REFACTOR cycle 1: manual zero-cost versions, edits, and approval

- [ ] **RED 1.1 — Write application behavior tests first.**

Create `manage-publishing-metadata.service.test.ts`:

```ts
import { expect, it, vi } from 'vitest';

import { ManagePublishingMetadataService } from './manage-publishing-metadata.service';

it('creates the first manual version with exactly zero OpenAI cost', async () => {
  const dependencies = makeMetadataManagementDependencies({ latestDraft: null });
  const service = new ManagePublishingMetadataService(dependencies);
  await service.createManual({
    projectId: projectId('018f4f2c-93d7-7c75-8f0f-7f5165e8bb70'),
    clipId: clipId('018f4f2c-93d7-7c75-8f0f-7f5165e8bb71'),
    metadata: makePublishingMetadataEntity(),
    idempotencyKey: 'manual-metadata:clip-1:1',
  });
  expect(dependencies.drafts.insertVersion).toHaveBeenCalledWith(expect.objectContaining({
    version: 1,
    source: 'MANUAL',
    modelId: null,
    reasoningLevel: null,
    estimatedCostMicrousd: 0n,
    actualCostMicrousd: 0n,
    aiUsageEventId: null,
  }));
  expect(dependencies.generator.generate).not.toHaveBeenCalled();
});

it('preserves generated provenance while saving reviewed fields', async () => {
  const draft = makeDraftEntity({
    source: 'OPENAI',
    revision: 3,
    modelId: 'gpt-5.6-sol',
    actualCostMicrousd: 12_345n,
  });
  const dependencies = makeMetadataManagementDependencies({ draft });
  const service = new ManagePublishingMetadataService(dependencies);
  await service.save({
    clipId: draft.clipId,
    draftId: draft.id,
    expectedRevision: 3,
    metadata: makePublishingMetadataEntity({ title: 'Reviewed title' }),
  });
  expect(dependencies.drafts.updateEditableRevision).toHaveBeenCalledWith(
    draft.id,
    3,
    expect.objectContaining({ title: 'Reviewed title' }),
  );
  expect(dependencies.drafts.updateEditableRevision.mock.calls[0]).not.toContain('gpt-5.6-sol');
});

it('rejects stale edits and already-approved mutation', async () => {
  const draft = makeDraftEntity({ state: 'APPROVED', revision: 4 });
  const service = makeMetadataManagementService({ draft });
  await expect(service.save({
    clipId: draft.clipId,
    draftId: draft.id,
    expectedRevision: 3,
    metadata: makePublishingMetadataEntity(),
  })).rejects.toMatchObject({ code: 'METADATA_DRAFT_NOT_EDITABLE' });
});

it('approves the exact revision and supersedes only the prior approved version', async () => {
  const previous = makeDraftEntity({ version: 1, state: 'APPROVED' });
  const candidate = makeDraftEntity({ version: 2, revision: 5, state: 'AWAITING_APPROVAL' });
  const dependencies = makeMetadataManagementDependencies({ draft: candidate, approvedDraft: previous });
  const service = new ManagePublishingMetadataService(dependencies);
  await service.approve({ clipId: candidate.clipId, draftId: candidate.id, expectedRevision: 5 });
  expect(dependencies.unitOfWork.execute).toHaveBeenCalledOnce();
  expect(dependencies.drafts.supersede).toHaveBeenCalledWith(previous.id, expect.any(Date));
  expect(dependencies.drafts.approve).toHaveBeenCalledWith(candidate.id, 5, expect.any(Date));
});
```

- [ ] **RED 1.2 — Witness missing service and repository operations.**

```bash
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/application/services/manage-publishing-metadata.service.test.ts
```

Expected RED: service/repository signature shells collect; approving revision 3 leaves the draft editable instead of returning the exact immutable approved revision and superseding older approved versions.

- [ ] **GREEN 1.3 — Implement minimum policy and transactional approval.**

`createManual` validates Task 2 metadata, derives `latest.version + 1`, and uses Phase 1 idempotency receipt plus unit-of-work. `save` requires matching clip, editable state `METADATA_DRAFT` or `AWAITING_APPROVAL`, matching revision, and validates metadata. `approve` reloads inside the unit-of-work, validates the current revision/fields, supersedes a different currently approved draft, then marks the candidate approved with one clock instant.

Add repository operations with these update predicates:

```ts
async approve(id: PublishingMetadataDraftId, revision: number, approvedAt: Date): Promise<PublishingMetadataDraftEntityDto | null> {
  const result = await this.prisma.publishingMetadataDraft.updateMany({
    where: { id, revision, state: { in: ['METADATA_DRAFT', 'AWAITING_APPROVAL'] } },
    data: { state: 'APPROVED', approvedAt, revision: { increment: 1 }, updatedAt: approvedAt },
  });
  return result.count === 1 ? this.findById(id) : null;
}

async supersede(id: PublishingMetadataDraftId, supersededAt: Date): Promise<PublishingMetadataDraftEntityDto | null> {
  const result = await this.prisma.publishingMetadataDraft.updateMany({
    where: { id, state: 'APPROVED' },
    data: { state: 'SUPERSEDED', supersededAt, revision: { increment: 1 } },
  });
  return result.count === 1 ? this.findById(id) : null;
}
```

Revise Task 4's approval check so `SUPERSEDED` requires `superseded_at` and allows historical `approved_at` to remain present; prefer retaining both approval/supersession audit timestamps:

```sql
alter table "publishing_metadata_drafts"
  drop constraint "publishing_metadata_drafts_approval_check",
  add constraint "publishing_metadata_drafts_approval_check" check (
    ("state" = 'APPROVED' and "approved_at" is not null and "superseded_at" is null) or
    ("state" = 'SUPERSEDED' and "approved_at" is not null and "superseded_at" is not null) or
    ("state" in ('METADATA_DRAFT', 'AWAITING_APPROVAL') and
      "approved_at" is null and "superseded_at" is null)
  );
```

Place this additive constraint change in `prisma/migrations/20260712000400_phase_2_metadata_approval/migration.sql`; never edit Task 4's applied SQL. Update `supersede` to retain `approvedAt`.

Run focused and migration tests. Expected GREEN: PASS.

- [ ] **REFACTOR 1.4 — Serialize competing approvals.**

Add a partial unique index in the same migration:

```sql
create unique index "publishing_metadata_drafts_one_approved_per_clip"
  on "publishing_metadata_drafts" ("clip_id")
  where "state" = 'APPROVED';
```

Append this disposable-PostgreSQL test:

```ts
it('allows exactly one approved draft under competing approvals', async () => {
  const [versionTwo, versionThree] = await seedTwoAwaitingApprovalDrafts(database, clipId);
  const results = await Promise.allSettled([
    approveDraftThroughService(versionTwo.id, versionTwo.revision),
    approveDraftThroughService(versionThree.id, versionThree.revision),
  ]);
  expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
  expect(results.filter((result) => result.status === 'rejected')[0]).toMatchObject({
    reason: expect.objectContaining({ code: 'METADATA_APPROVAL_CONFLICT' }),
  });
  expect(await database.query<{ count: bigint }>(
    `select count(*)::bigint as count
     from publishing_metadata_drafts
     where clip_id = $1 and state = 'APPROVED'`,
    [clipId],
  )).toEqual([{ count: 1n }]);
});
```

Witness RED before the partial index/error mapping, implement, and rerun; expected GREEN is one approved row.

## RED-GREEN-REFACTOR cycle 2: closed HTTP DTOs and explicit converters

- [ ] **RED 2.1 — Write converter/route tests first.**

`publishing-metadata.converter.test.ts`:

```ts
it('maps API strings/arrays to a distinct validated Entity DTO', () => {
  expect(publishingMetadataApiToEntity({
    title: 'Reviewed title',
    description: 'Reviewed description',
    hashtags: ['#ClipFactory'],
    keywordTags: ['clip factory'],
    categoryId: '22',
    defaultLanguage: 'en',
    madeForKids: false,
    containsSyntheticMedia: false,
  })).toEqual(makePublishingMetadataEntity({ title: 'Reviewed title' }));
});

it('serializes bigint costs as decimal strings', () => {
  expect(metadataDraftEntityToApi(makeDraftEntity({ actualCostMicrousd: 12_345n })))
    .toMatchObject({ actualCostMicrousd: '12345' });
});
```

Controller test:

```ts
await testApi.patch(`/api/v1/clips/${clipId}/youtube/metadata-drafts/${draftId}`)
  .send({ revision: 3, metadata: makePublishingMetadataApi({ title: 'x'.repeat(101) }) })
  .expect(400, expect.objectContaining({ code: 'INVALID_PUBLISHING_METADATA' }));

await testApi.post(`/api/v1/clips/${clipId}/youtube/metadata-drafts/${draftId}/approve`)
  .send({ revision: 3, confirmed: false })
  .expect(400, expect.objectContaining({ code: 'EXPLICIT_CONFIRMATION_REQUIRED' }));
```

- [ ] **RED 2.2 — Witness missing delivery.**

```bash
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/converters/api-entity/publishing-metadata.converter.test.ts src/modules/youtube-publishing/delivery/http/publishing-metadata.controller.test.ts
```

Expected RED: converter/controller/route shells collect; the 101-code-point PATCH returns `501 NOT_IMPLEMENTED` instead of `400 INVALID_PUBLISHING_METADATA`. A route `404` is not accepted.

- [ ] **GREEN 2.3 — Implement validators/converters/thin routes.**

Create closed API schemas for metadata and draft responses. List GET returns versions newest-first. Manual POST requires `Idempotency-Key` and returns `201`. PATCH requires integer revision and returns `409` on stale revision. Approve POST requires `{ revision, confirmed: true }` and returns the approved version. Controllers call one application method and convert results; they do not implement limits or approval state.

```ts
export const updatePublishingMetadataSchema = z.object({
  revision: z.number().int().nonnegative(),
  metadata: publishingMetadataApiSchema,
}).strict();

export const approvePublishingMetadataSchema = z.object({
  revision: z.number().int().nonnegative(),
  confirmed: z.literal(true),
}).strict();

async update(request: AuthenticatedRequest): Promise<ApiResponse> {
  const body = updatePublishingMetadataSchema.parse(request.body);
  const result = await this.service.save({
    clipId: parseClipId(request.params.clipId),
    draftId: parsePublishingMetadataDraftId(request.params.draftId),
    expectedRevision: body.revision,
    metadata: publishingMetadataApiToEntity(body.metadata),
  });
  return { status: 200, body: metadataDraftEntityToApi(result) };
}
```

```bash
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/converters/api-entity/publishing-metadata.converter.test.ts src/modules/youtube-publishing/delivery/http/publishing-metadata.controller.test.ts
```

Expected GREEN: PASS.

- [ ] **REFACTOR 2.4 — Prove enum/nullability/money loss cases.**

Append a table test for `METADATA_DRAFT`, `AWAITING_APPROVAL`, `APPROVED`, and `SUPERSEDED`, plus these loss-risk cases:

```ts
it('preserves null/manual and generated provenance plus large money', () => {
  expect(metadataDraftEntityToApi(makeDraftEntity({
    source: 'MANUAL',
    modelId: null,
    aiUsageEventId: null,
    actualCostMicrousd: 0n,
  }))).toMatchObject({ modelId: null, aiUsageEventId: null, actualCostMicrousd: '0' });
  expect(metadataDraftEntityToApi(makeDraftEntity({
    source: 'OPENAI',
    actualCostMicrousd: 9_007_199_254_740_992n,
  }))).toMatchObject({ actualCostMicrousd: '9007199254740992' });
});

it.each([
  [makeDraftApi({ state: 'PUBLISHED' }), 'unknown metadata draft state'],
  [makeDraftApi({ defaultLanguage: 'not_a_tag' }), 'invalid BCP-47 language tag'],
  [makeDraftApi({ description: 'é'.repeat(2501) }), 'description exceeds 5000 UTF-8 bytes'],
])('rejects lossy or invalid API data', (value, message) => {
  expect(() => metadataDraftApiToEntity(value)).toThrow(message);
});
```

Rerun converter/route tests and architecture checks; expected GREEN is PASS.

## RED-GREEN-REFACTOR cycle 3: accessible metadata editor and history

- [ ] **RED 3.1 — Write component behavior tests first.**

Create `publishing-metadata-editor.test.tsx`:

```tsx
it('shows provenance/cost and keeps generated fields editable', async () => {
  const onSave = vi.fn();
  render(
    <PublishingMetadataEditor
      viewModel={makeMetadataEditorVm({
        sourceLabel: 'Generated with gpt-5.6-sol · high',
        actualCostLabel: '$0.012345',
      })}
      onSave={onSave}
      onApprove={vi.fn()}
      onGenerate={vi.fn()}
      onSelectVersion={vi.fn()}
    />,
  );
  expect(screen.getByText('Generated with gpt-5.6-sol · high')).toBeVisible();
  expect(screen.getByText('$0.012345')).toBeVisible();
  await user.clear(screen.getByLabelText('YouTube title'));
  await user.type(screen.getByLabelText('YouTube title'), 'Reviewed title');
  await user.click(screen.getByRole('button', { name: 'Save draft' }));
  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ title: 'Reviewed title' }));
});

it('counts description UTF-8 bytes and blocks invalid approval', async () => {
  render(<MetadataEditorHarness initialDescription={'é'.repeat(2501)} />);
  expect(screen.getByText('5002 / 5000 bytes')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Approve metadata' })).toBeDisabled();
  expect(screen.getByText('Description exceeds 5000 UTF-8 bytes.')).toBeVisible();
});

it('requires paid-generation confirmation and never overwrites the selected version', async () => {
  const onGenerate = vi.fn();
  render(<MetadataEditorHarness onGenerate={onGenerate} version={2} />);
  await user.click(screen.getByRole('button', { name: 'Generate new draft' }));
  expect(screen.getByRole('dialog', { name: 'Generate metadata with OpenAI?' })).toBeVisible();
  expect(screen.getByText(/creates version 3 and keeps version 2/)).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Confirm paid generation' }));
  expect(onGenerate).toHaveBeenCalledOnce();
});

it('labels unavailable GPT-5.6 and requires explicit GPT-5.5 selection', async () => {
  const onSelectModel = vi.fn();
  render(<MetadataEditorHarness
    selectedModelId="gpt-5.6-sol"
    modelOptions={[
      { id: 'gpt-5.6-sol', label: 'GPT-5.6 (not enabled for this API project)', available: false },
      { id: 'gpt-5.5', label: 'GPT-5.5', available: true },
    ]}
    onSelectModel={onSelectModel}
  />);
  expect(screen.getByRole('option', { name: /GPT-5.6.*not enabled/ })).toBeDisabled();
  expect(onSelectModel).not.toHaveBeenCalled();
  await user.selectOptions(screen.getByLabelText('OpenAI model'), 'gpt-5.5');
  expect(onSelectModel).toHaveBeenCalledWith('gpt-5.5');
});

it('requires explicit approval and locks the approved revision', async () => {
  const onApprove = vi.fn();
  render(<MetadataEditorHarness onApprove={onApprove} />);
  await user.click(screen.getByRole('button', { name: 'Approve metadata' }));
  expect(screen.getByRole('dialog', { name: 'Approve this exact metadata?' })).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Approve version 2' }));
  expect(onApprove).toHaveBeenCalledWith({ draftId: expect.any(String), revision: 3 });
});

it('discloses possible spend and requires fresh authorization after paid-call uncertainty', async () => {
  const onGenerate = vi.fn();
  render(<MetadataEditorHarness
    onGenerate={onGenerate}
    generationState="PAID_CALL_UNCERTAIN"
    possibleSpendLabel="Up to $0.050000 may have been spent."
  />);
  expect(screen.getByText('The provider result is unknown. Your current draft was not changed.')).toBeVisible();
  expect(screen.getByText('Up to $0.050000 may have been spent.')).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Authorize a new generation attempt' }));
  const checkbox = screen.getByRole('checkbox', { name: /possible prior spend/i });
  expect(screen.getByRole('button', { name: 'Reserve and generate again' })).toBeDisabled();
  await user.click(checkbox);
  await user.click(screen.getByRole('button', { name: 'Reserve and generate again' }));
  expect(onGenerate).toHaveBeenCalledWith(expect.objectContaining({
    possiblePriorSpendAcknowledged: true,
    priorUncertainAttemptId: expect.any(String),
  }));
});
```

- [ ] **RED 3.2 — Witness missing editor.**

```bash
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/delivery/ui/publishing-metadata-editor.test.tsx
```

Expected RED: editor/view-model shells render; `getByLabelText('YouTube title')` fails because the controlled semantic title input is not yet present.

- [ ] **GREEN 3.3 — Implement controlled semantic form.**

Render labeled native inputs for title, description, hashtags, keyword tags, category, default language, made-for-kids, and synthetic-media declaration. Do not render visibility or schedule controls in this component; Task 14 owns those controls in the publication panel. Build model/reasoning options from the Phase 1 catalog plus access projection: GPT-5.6/high remains the default label, unavailable options are disabled with the safe access reason, GPT-5.5 is selectable only by an explicit user action, and no effect silently changes either model or reasoning. Show title code-point and description UTF-8-byte counters, 500-character YouTube keyword accounting, field errors linked with `aria-describedby`, version selector/history, model/reasoning/exact cost, and manual `$0.000000`. `PAID_CALL_UNCERTAIN` shows the possible-spend amount, states that the current draft was not changed, disables automatic retry, and requires a checked acknowledgement before emitting a new request/reservation. Use Phase 1 buttons/dialog/tokens and live save/generation states.

```tsx
<label htmlFor="metadata-model">OpenAI model</label>
<select
  id="metadata-model"
  value={viewModel.selectedModelId}
  onChange={(event) => onSelectModel(event.currentTarget.value as CompatibleModelId)}
>
  {viewModel.modelOptions.map((option) => (
    <option key={option.id} value={option.id} disabled={!option.available}>
      {option.label}
    </option>
  ))}
</select>
```

```tsx
const descriptionBytes = new TextEncoder().encode(form.description).byteLength;
const canApprove = viewModel.validationErrors.length === 0 && !saving;

<label htmlFor="youtube-description">Description</label>
<textarea
  id="youtube-description"
  aria-describedby="youtube-description-count youtube-description-error"
  value={form.description}
  onChange={(event) => setForm({ ...form, description: event.currentTarget.value })}
/>
<output id="youtube-description-count">{descriptionBytes} / 5000 bytes</output>
{viewModel.descriptionError && (
  <p id="youtube-description-error" role="alert">{viewModel.descriptionError}</p>
)}
<button disabled={!canApprove} onClick={() => setApprovalOpen(true)}>
  Approve metadata
</button>
```

The uncertainty dialog controls the emitted acknowledgement directly:

```tsx
<input
  id="possible-prior-spend"
  type="checkbox"
  checked={possibleSpendAcknowledged}
  onChange={(event) => setPossibleSpendAcknowledged(event.currentTarget.checked)}
/>
<button
  disabled={!possibleSpendAcknowledged}
  onClick={() => onGenerate({
    priorUncertainAttemptId: viewModel.priorUncertainAttemptId,
    possiblePriorSpendAcknowledged: true,
  })}
>
  Reserve and generate again
</button>
```

```css
.editor { display: grid; min-inline-size: 0; gap: var(--space-6); }
.fields { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-4); }
.history { min-inline-size: 0; overflow-x: auto; background: var(--color-surface); }
.actions { position: sticky; inset-block-end: 0; display: flex; flex-wrap: wrap; gap: var(--space-3); padding: var(--space-3); background: var(--color-surface-raised); }
.error { color: var(--color-danger); overflow-wrap: anywhere; }
@media (min-width: 64rem) {
  .editor { grid-template-columns: minmax(0, 2fr) minmax(18rem, 1fr); align-items: start; }
  .actions { grid-column: 1 / -1; }
}
@media (max-width: 47.99rem) { .actions > button { flex: 1 1 100%; } }
@media (prefers-reduced-motion: reduce) { .editor * { transition-duration: 0.01ms; } }
```

```bash
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/delivery/ui/publishing-metadata-editor.test.tsx
```

Expected GREEN: PASS.

- [ ] **REFACTOR 3.4 — Make all states exhaustive and keyboard-accessible.**

Append a table-driven visible-status test:

```tsx
it.each([
  ['MANUAL_DRAFT', 'Manual draft'],
  ['GENERATED_DRAFT', 'Generated draft'],
  ['GENERATING', 'Generating metadata'],
  ['AWAITING_APPROVAL', 'Awaiting approval'],
  ['APPROVED', 'Approved'],
  ['SUPERSEDED', 'Superseded'],
  ['STALE_CONFLICT', 'This draft changed in another request'],
  ['PAID_CALL_UNCERTAIN', 'The provider result is unknown'],
] as const)('renders accessible state %s', (state, label) => {
  render(<MetadataEditorHarness editorState={state} />);
  expect(screen.getByRole('status')).toHaveTextContent(label);
});
```

Add one keyboard test that Tabs through title/save/approve, opens approval, presses Escape, and expects focus back on `Approve metadata`. Witness missing branches/focus behavior, implement exhaustive mapping/dialog focus return, and rerun component tests.

## Broader verification

- [ ] Run:

```bash
pnpm prisma:generate
pnpm db:migrate:deploy
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/application/services/manage-publishing-metadata.service.test.ts src/modules/youtube-publishing/converters/api-entity/publishing-metadata.converter.test.ts src/modules/youtube-publishing/delivery/http/publishing-metadata.controller.test.ts src/modules/youtube-publishing/delivery/ui/publishing-metadata-editor.test.tsx
pnpm test:integration
pnpm test:architecture
pnpm test:coverage
pnpm typecheck
pnpm format:check
git diff --check
```

- [ ] Verify manual draft create/edit/approval produces no `AIUsageEvent` and exactly zero cost.
- [ ] Verify regeneration adds a row and approved/stale fields are never silently overwritten; `PAID_CALL_UNCERTAIN` adds no generated draft result and cannot auto-retry.
- [ ] Verify no upload/publication creation API accepts an unapproved or superseded draft.

## Review gate

Approve only when manual and generated versions are equally editable, provenance/cost remain visible, byte/character/tag constraints match domain policy, stale edits conflict, exactly one version is approved, and explicit confirmation gates generation/approval.

## Suggested commit

```text
feat(youtube): add reviewed metadata draft workflow
```
