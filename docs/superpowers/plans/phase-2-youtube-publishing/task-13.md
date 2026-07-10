# Task 13: Project YouTube Gallery/List Workspace

> **Implementation mode:** Complete after Tasks 3–5 and 8. This task is a read-only project workspace; editing/publishing controls remain in Tasks 10 and 14.

## Purpose

Add a project-level `YouTube` tab that shows every successfully rendered clip in a switchable gallery/list view with publishing metadata, independent schedule, status, last sanitized error, and YouTube URL. Persist only the single-user view preference locally.

## Requirements and traceability

- YouTube design §5: project tab, gallery/list switch, exact card/column data, sortable list, locally stored preference, editor navigation.
- Acceptance criterion 4: every rendered project clip is visible and view switching works.
- Clean Architecture §19: query policy in application service, API/Entity/UI DTO separation, UI presentation-only.

## Clean Architecture ownership

- **Affected layers:** application query service/ports, API delivery/converter, UI view models/components.
- **Uses:** read-only core clip/render ports and Task 3–5 data services; it does not import repositories.
- **UI boundary:** view models contain formatted strings/links and callbacks only; no Entity/Record/API/SDK type reaches components.
- **Local storage:** key `clip-factory:youtube-workspace:view`; value only `gallery` or `list`.

## Files

- Create: `apps/web/src/modules/youtube-publishing/application/dto/entity/youtube-workspace-entity.dto.ts`
- Create: `apps/web/src/modules/youtube-publishing/application/ports/rendered-clip-read-port.ts`
- Create: `apps/web/src/modules/youtube-publishing/application/services/get-youtube-workspace.service.ts`
- Create: `apps/web/src/modules/youtube-publishing/application/services/get-youtube-workspace.service.test.ts`
- Create: `apps/web/src/modules/youtube-publishing/delivery/http/dto/api/youtube-workspace-api.dto.ts`
- Create: `apps/web/src/modules/youtube-publishing/converters/api-entity/youtube-workspace.converter.ts`
- Create: `apps/web/src/modules/youtube-publishing/converters/api-entity/youtube-workspace.converter.test.ts`
- Create: `apps/web/src/modules/youtube-publishing/delivery/http/youtube-workspace.controller.ts`
- Create: `apps/web/src/app/api/v1/projects/[projectId]/youtube-workspace/route.ts`
- Create: `apps/web/src/modules/youtube-publishing/delivery/http/youtube-workspace.controller.test.ts`
- Create: `apps/web/src/modules/youtube-publishing/delivery/ui/youtube-workspace.vm.ts`
- Create: `apps/web/src/modules/youtube-publishing/delivery/ui/use-youtube-workspace-view.ts`
- Create: `apps/web/src/modules/youtube-publishing/delivery/ui/youtube-workspace.tsx`
- Create: `apps/web/src/modules/youtube-publishing/delivery/ui/youtube-workspace.module.css`
- Create: `apps/web/src/modules/youtube-publishing/delivery/ui/youtube-workspace.test.tsx`
- Create: `apps/web/src/app/projects/[projectId]/youtube/page.tsx`
- Modify: `apps/web/src/app/projects/[projectId]/layout.tsx`
- Modify: `apps/web/src/modules/youtube-publishing/composition/youtube-publishing.module.ts`

## Prerequisites

- Accepted Phase 1 project navigation, clip origin, render output/poster, URL signing, and duration formatting conventions.
- Tasks 3–5 query data and Task 8 connection projection are green.

## Interfaces

```ts
export type RenderedClipPublishingRowEntityDto = {
  clipId: ClipId;
  renderId: RenderId;
  posterObjectKey: string;
  durationMs: number;
  origin: 'AI_HIGHLIGHT' | 'MANUAL';
  approvedDraft: PublishingMetadataDraftEntityDto | null;
  latestDraft: PublishingMetadataDraftEntityDto | null;
  latestPublication: PublicationEntityDto | null;
};

export type YouTubeWorkspaceEntityDto = {
  projectId: ProjectId;
  connection: YouTubeConnectionEntityDto | null;
  clips: readonly RenderedClipPublishingRowEntityDto[];
};

export type CompletedRenderedClipReadDto = Pick<
  RenderedClipPublishingRowEntityDto,
  'clipId' | 'renderId' | 'posterObjectKey' | 'durationMs' | 'origin'
>;
```

`RenderedClipReadPort.listLatestCompletedByProject(projectId)` filters the Phase 1 persisted state `COMPLETED`, selects each clip's latest render by `Render.createdAt DESC, Render.id DESC`, then orders rows by `Clip.createdAt ASC, Clip.id ASC`. Its adapter belongs to the core rendering boundary/composition and returns `CompletedRenderedClipReadDto`; it never fabricates the nonexistent `SUCCEEDED` state or relies on database iteration order.

## RED-GREEN-REFACTOR cycle 1: complete read model and state projection

- [ ] **RED 1.1 — Write query service tests first.**

Create `get-youtube-workspace.service.test.ts`:

```ts
import { expect, it } from 'vitest';

import { GetYouTubeWorkspaceService } from './get-youtube-workspace.service';

it('returns every rendered clip even when metadata/publication is absent', async () => {
  const dependencies = makeWorkspaceDependencies({
    renderedClips: [
      makeRenderedClip({ clipId: 'clip-1', origin: 'AI_HIGHLIGHT' }),
      makeRenderedClip({ clipId: 'clip-2', origin: 'MANUAL' }),
      makeRenderedClip({ clipId: 'clip-3', origin: 'MANUAL' }),
    ],
    drafts: [makeDraftEntity({ clipId: 'clip-1', state: 'APPROVED' })],
    publications: [makePublicationEntity({ clipId: 'clip-1', state: 'SCHEDULED' })],
  });
  const service = new GetYouTubeWorkspaceService(dependencies);
  const result = await service.get(projectId('project-1'));
  expect(result.clips.map((clip) => clip.clipId)).toEqual(['clip-1', 'clip-2', 'clip-3']);
  expect(result.clips[1]).toMatchObject({ approvedDraft: null, latestPublication: null });
});

it('selects the latest successful render, latest draft, approved draft, and latest publication deterministically', async () => {
  const service = new GetYouTubeWorkspaceService(makeWorkspaceDependenciesWithHistory());
  const result = await service.get(projectId('project-1'));
  expect(result.clips[0]).toMatchObject({
    renderId: 'render-newest-success',
    approvedDraft: { version: 2 },
    latestDraft: { version: 3 },
    latestPublication: { id: 'publication-newest' },
  });
});

it('never lists a failed or in-progress render as publishable', async () => {
  const dependencies = makeWorkspaceDependencies({
    renderedClips: [],
    nonSuccessfulRenders: [makeRender({ status: 'FAILED' }), makeRender({ status: 'RENDERING' })],
  });
  const result = await new GetYouTubeWorkspaceService(dependencies).get(projectId('project-1'));
  expect(result.clips).toEqual([]);
});
```

- [ ] **RED 1.2 — Witness missing query service/port.**

```bash
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/application/services/get-youtube-workspace.service.test.ts
```

Expected RED: query service/port/DTO shells collect; the three successful renders produce an empty `clips` array instead of three workspace rows.

- [ ] **GREEN 1.3 — Implement deterministic joins in application policy.**

The service calls the narrow render read port plus connection/draft/publication data services. It groups records by branded `ClipId`, selects highest draft version, approved draft, and newest publication by `createdAt`/ID, then maps onto the complete successful-render list. It never hides clips for missing connection/metadata/publication and never performs DB joins in a repository.

```ts
const byNewestPublication = (left: PublicationEntityDto, right: PublicationEntityDto) =>
  left.createdAt.getTime() - right.createdAt.getTime()
  || left.id.localeCompare(right.id);

const clips = successfulRenders.map((render) => {
  const clipDrafts = draftsByClip.get(render.clipId) ?? [];
  const clipPublications = publicationsByClip.get(render.clipId) ?? [];
  return {
    clipId: render.clipId,
    renderId: render.renderId,
    posterObjectKey: render.posterObjectKey,
    durationMs: render.durationMs,
    origin: render.origin,
    latestDraft: clipDrafts.toSorted((a, b) => b.version - a.version)[0] ?? null,
    approvedDraft: clipDrafts.toSorted((a, b) => b.version - a.version)
      .find((draft) => draft.state === MetadataDraftState.Approved) ?? null,
    latestPublication: clipPublications.toSorted(byNewestPublication).at(-1) ?? null,
  };
});
```

```bash
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/application/services/get-youtube-workspace.service.test.ts
```

Expected GREEN: PASS.

- [ ] **REFACTOR 1.4 — Make ordering and tie-breaks explicit.**

Append this test:

```ts
it('uses immutable ID as the final tie-breaker for equal timestamps', async () => {
  const service = new GetYouTubeWorkspaceService(makeWorkspaceDependencies({
    publications: [
      makePublicationEntity({ id: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb80', createdAt: fixedTime }),
      makePublicationEntity({ id: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb81', createdAt: fixedTime }),
    ],
  }));
  const result = await service.get(projectId('018f4f2c-93d7-7c75-8f0f-7f5165e8bb70'));
  expect(result.clips[0].latestPublication?.id).toBe(
    '018f4f2c-93d7-7c75-8f0f-7f5165e8bb81',
  );
});
```

Witness RED if iteration order wins, implement one comparator `(createdAt, id)`, and rerun.

## RED-GREEN-REFACTOR cycle 2: API boundary and safe poster/YouTube links

- [ ] **RED 2.1 — Write converter and HTTP tests.**

`youtube-workspace.converter.test.ts`:

```ts
it('maps Entity rows to API strings without leaking object keys or bigint', async () => {
  const api = await youtubeWorkspaceEntityToApi(makeWorkspaceEntity(), {
    createPosterUrl: async () => 'http://127.0.0.1:3000/api/v1/media/poster-token',
  });
  expect(api.clips[0]).toEqual(expect.objectContaining({
    clipId: 'clip-1',
    posterUrl: 'http://127.0.0.1:3000/api/v1/media/poster-token',
    durationMs: 59_000,
    origin: 'AI_HIGHLIGHT',
    metadata: expect.objectContaining({ actualCostMicrousd: '12345' }),
    publication: expect.objectContaining({
      state: 'SCHEDULED',
      timezone: 'Asia/Tokyo',
      youtubeUrl: 'https://youtu.be/video-safe-1',
    }),
  }));
  expect(JSON.stringify(api)).not.toContain('renders/clip-1/final-poster.jpg');
});
```

Controller test:

```ts
await testApi.get(`/api/v1/projects/${projectId}/youtube-workspace`)
  .expect(200)
  .expect(({ body }) => {
    expect(body.clips).toHaveLength(3);
    expect(body.clips.every((clip) => clip.renderStatus === 'COMPLETED')).toBe(true);
  });
```

- [ ] **RED 2.2 — Witness missing converter/route.**

```bash
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/converters/api-entity/youtube-workspace.converter.test.ts src/modules/youtube-publishing/delivery/http/youtube-workspace.controller.test.ts
```

Expected RED: converter/controller/route shells collect; the registered route returns `501 NOT_IMPLEMENTED` instead of a `200` response containing all three successful renders. A route `404` is not accepted.

- [ ] **GREEN 2.3 — Implement closed response and one-entry controller.**

API DTO includes project/connection and clip rows with poster URL, duration, origin, reviewed title, metadata state/model/reasoning/cost, publication state/visibility/source schedule/UTC/timezone/error/URL. Entity-to-API converter asks the existing Phase 1 media-URL port for a short-lived poster URL and serializes bigint as decimal strings/Date as ISO. Validate stored YouTube URL host is `youtube.com`, `www.youtube.com`, or `youtu.be`; otherwise return null plus safe error code `INVALID_STORED_YOUTUBE_URL`.

Controller parses project ID, calls one service, converts once, and returns 200. Run focused tests. Expected GREEN: PASS.

```ts
function safeYouTubeUrl(value: string | null): {
  url: string | null;
  errorCode: 'INVALID_STORED_YOUTUBE_URL' | null;
} {
  if (!value) return { url: null, errorCode: null };
  try {
    const url = new URL(value);
    const valid = url.protocol === 'https:'
      && url.username === ''
      && url.password === ''
      && (url.port === '' || url.port === '443')
      && ['youtube.com', 'www.youtube.com', 'youtu.be'].includes(url.hostname);
    return valid
      ? { url: url.toString(), errorCode: null }
      : { url: null, errorCode: 'INVALID_STORED_YOUTUBE_URL' };
  } catch {
    return { url: null, errorCode: 'INVALID_STORED_YOUTUBE_URL' };
  }
}

async get(request: AuthenticatedRequest): Promise<ApiResponse> {
  const workspace = await this.service.get(parseProjectId(request.params.projectId));
  return {
    status: 200,
    body: await youtubeWorkspaceEntityToApi(workspace, this.mediaUrls),
  };
}
```

```bash
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/converters/api-entity/youtube-workspace.converter.test.ts src/modules/youtube-publishing/delivery/http/youtube-workspace.controller.test.ts
```

- [ ] **REFACTOR 2.4 — Exercise nullability and every state.**

Append this boundary table:

```ts
it.each([
  [makeWorkspaceEntity({ connection: null }), { connection: null }],
  [makeWorkspaceEntity({ latestDraft: null }), { metadata: null }],
  [makeWorkspaceEntity({ publicationState: 'FAILED' }), {
    publication: expect.objectContaining({ state: 'FAILED', errorCode: 'UPLOAD_REJECTED' }),
  }],
  [makeWorkspaceEntity({ publicationState: 'UPLOAD_OUTCOME_UNCERTAIN', youtubeUrl: null }), {
    publication: expect.objectContaining({
      state: 'UPLOAD_OUTCOME_UNCERTAIN',
      youtubeUrl: null,
      requiredAction: 'RECONCILE_CHANNEL_THEN_ACKNOWLEDGE_DUPLICATE_RISK',
    }),
  }],
])('maps nullable/state boundary without fabrication', async (entity, expected) => {
  expect(await youtubeWorkspaceEntityToApi(entity, mediaUrlPort)).toMatchObject(expected);
});
```

Add direct cases for all remaining `PublicationState` values, scheduled/private tuple, warning, manual/generated cost, invalid YouTube URL, and poster-signing failure using the same closed fixtures. For upload uncertainty expose only safe state/reconciliation/action fields and no fabricated URL. Rerun converter/HTTP tests.

## RED-GREEN-REFACTOR cycle 3: gallery/list preference, sorting, and accessibility

- [ ] **RED 3.1 — Write UI tests first.**

Create `youtube-workspace.test.tsx`:

```tsx
it('renders every clip in gallery and persists only the view preference', async () => {
  const storage = makeStorage();
  render(<YouTubeWorkspace viewModel={makeWorkspaceVm({ clipCount: 3 })} storage={storage} />);
  expect(screen.getAllByRole('article')).toHaveLength(3);
  await user.click(screen.getByRole('radio', { name: 'List view' }));
  expect(screen.getByRole('table', { name: 'YouTube publishing clips' })).toBeVisible();
  expect(storage.values).toEqual({ 'clip-factory:youtube-workspace:view': 'list' });
});

it('restores a valid preference and ignores invalid storage data', () => {
  const listStorage = makeStorage({ 'clip-factory:youtube-workspace:view': 'list' });
  const { unmount } = render(
    <YouTubeWorkspace viewModel={makeWorkspaceVm()} storage={listStorage} />,
  );
  expect(screen.getByRole('radio', { name: 'List view' })).toBeChecked();
  unmount();
  render(<YouTubeWorkspace
    viewModel={makeWorkspaceVm()}
    storage={makeStorage({ 'clip-factory:youtube-workspace:view': 'credential-shaped-junk' })}
  />);
  expect(screen.getByRole('radio', { name: 'Gallery view' })).toBeChecked();
});

it('sorts list columns without changing gallery source order', async () => {
  render(<YouTubeWorkspace viewModel={makeWorkspaceVmWithTitles(['Zulu', 'Alpha'])} />);
  await user.click(screen.getByRole('radio', { name: 'List view' }));
  await user.click(screen.getByRole('button', { name: 'Sort by title' }));
  expect(screen.getAllByRole('row')[1]).toHaveTextContent('Alpha');
  await user.click(screen.getByRole('radio', { name: 'Gallery view' }));
  expect(screen.getAllByRole('article')[0]).toHaveTextContent('Zulu');
});

it('shows thumbnail limitation and statuses without color-only meaning', () => {
  render(<YouTubeWorkspace viewModel={makeWorkspaceVm({ thumbnailWarning: true })} />);
  expect(screen.getByText(/Shorts do not support custom thumbnails like long-form uploads/)).toBeVisible();
  expect(screen.getByText('Scheduled')).toHaveAccessibleName(/status scheduled/i);
});

it('shows an unknown final upload as a reconciliation action, not failed or retryable', () => {
  render(<YouTubeWorkspace viewModel={makeWorkspaceVm({
    publicationState: 'UPLOAD_OUTCOME_UNCERTAIN',
    youtubeUrl: null,
  })} />);
  expect(screen.getByText('Upload result unknown')).toBeVisible();
  expect(screen.getByRole('link', { name: 'Reconcile this upload' })).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Retry upload' })).not.toBeInTheDocument();
});
```

- [ ] **RED 3.2 — Witness missing UI/hook.**

```bash
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/delivery/ui/youtube-workspace.test.tsx
```

Expected RED: UI shells render; `getByRole('radiogroup', { name: 'Clip display' })` fails because Gallery/List semantics are not yet present.

- [ ] **GREEN 3.3 — Implement view models and semantic views.**

Use a radio group labeled `Clip display` for Gallery/List. Gallery uses an ordered list of `article` elements with poster alt text, duration, title/state/cost. List uses a captioned table with sortable buttons for clip, origin, metadata, model/reasoning, cost, upload state, visibility, scheduled time, timezone, and URL. Sort copies rows; it never mutates source order. External URL uses `target=_blank` plus `rel="noreferrer"` and visible text.

`useYouTubeWorkspaceView` accepts a minimal `Storage` port, reads once after hydration, accepts only `gallery|list`, and writes only the key/value above. Catch storage denial by keeping gallery default and exposing no error. No project/clip/channel/publishing data enters storage.

```tsx
export function useYouTubeWorkspaceView(storage: Pick<Storage, 'getItem' | 'setItem'>) {
  const [view, setView] = useState<'gallery' | 'list'>('gallery');
  useEffect(() => {
    try {
      const stored = storage.getItem('clip-factory:youtube-workspace:view');
      if (stored === 'gallery' || stored === 'list') setView(stored);
    } catch { /* storage denial keeps the safe default */ }
  }, [storage]);
  const select = (next: 'gallery' | 'list') => {
    setView(next);
    try { storage.setItem('clip-factory:youtube-workspace:view', next); } catch { /* no-op */ }
  };
  return { view, select } as const;
}

<fieldset role="radiogroup" aria-label="Clip display">
  <legend>Clip display</legend>
  {(['gallery', 'list'] as const).map((value) => (
    <label key={value}>
      <input type="radio" checked={view === value} onChange={() => select(value)} />
      {value === 'gallery' ? 'Gallery view' : 'List view'}
    </label>
  ))}
</fieldset>
```

```css
.workspace { display: grid; min-inline-size: 0; gap: var(--space-6); }
.toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-3); }
.gallery { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr)); gap: var(--space-4); margin: 0; padding: 0; list-style: none; }
.card { min-inline-size: 0; padding: var(--space-4); border-radius: var(--radius-panel); background: var(--color-surface); overflow-wrap: anywhere; }
.tableViewport { max-inline-size: 100%; overflow-x: auto; overscroll-behavior-inline: contain; }
.table { inline-size: max(100%, 64rem); border-collapse: collapse; }
.table th, .table td { padding: var(--space-3); text-align: start; vertical-align: top; }
@media (min-width: 64rem) { .workspace { gap: var(--space-8); } }
@media (max-width: 47.99rem) { .tableViewport { border: 1px solid var(--color-surface-raised); } }
@media (prefers-reduced-motion: reduce) { .workspace * { scroll-behavior: auto; transition-duration: 0.01ms; } }
```

```bash
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/delivery/ui/youtube-workspace.test.tsx
```

Expected GREEN: PASS.

- [ ] **REFACTOR 3.4 — Verify empty/loading/error/narrow states.**

Append a table-driven render-state test:

```tsx
it.each([
  [makeWorkspaceVm({ clips: [] }), 'No rendered clips are ready for YouTube.'],
  [makeWorkspaceVm({ loading: true }), 'Loading YouTube workspace'],
  [makeWorkspaceVm({ error: 'Could not load publishing records.' }), 'Could not load publishing records.'],
])('renders workspace state accessibly', (viewModel, message) => {
  render(<YouTubeWorkspace viewModel={viewModel} />);
  expect(screen.getByText(message)).toBeVisible();
});
```

Add one keyboard test for gallery/list and sort. Assert the Gallery DOM uses `.gallery`, List wraps the table in `.tableViewport`, and long title/error fixtures remain visible or expose full text via accessible name. Task 16 performs real 768/1024/1440 browser layout checks against the CSS media rules.

## RED-GREEN-REFACTOR cycle 4: project navigation integration

- [ ] **RED 4.1 — Write route/page navigation test.**

```tsx
it('adds a YouTube project tab without changing the Phase 1 editor route', async () => {
  render(<ProjectLayoutNavigation projectId="project-1" activeTab="youtube" />);
  expect(screen.getByRole('link', { name: 'YouTube' })).toHaveAttribute(
    'href',
    '/projects/project-1/youtube',
  );
  expect(screen.getByRole('link', { name: 'Editor' })).toHaveAttribute(
    'href',
    '/projects/project-1/editor',
  );
});
```

Run:

```bash
pnpm --filter @clip-factory/web exec vitest run 'src/app/projects/[projectId]/layout.test.tsx'
```

Expected RED: layout/page shells render; `getByRole('link', { name: 'YouTube' })` fails because the feature-flagged project tab is not yet emitted; the test must not fail from an unresolved page import.

- [ ] **GREEN 4.2 — Add page and feature-flagged navigation.**

Server page calls the workspace controller/query through the established Phase 1 server composition boundary, maps to UI VM, and renders `YouTubeWorkspace`. Navigation shows the tab only when `CLIP_FACTORY_YOUTUBE_PUBLISHING=true`; direct disabled route returns 404. Do not modify editor behavior or core DTOs.

```tsx
export default async function YouTubeWorkspacePage({ params }: PageProps) {
  if (!featureFlags.youtubePublishing) notFound();
  const { projectId } = await params;
  const workspace = await youtubePublishingModule.workspace.get(parseProjectId(projectId));
  return <YouTubeWorkspace viewModel={youtubeWorkspaceEntityToVm(workspace)} />;
}

{featureFlags.youtubePublishing && (
  <Link href={`/projects/${projectId}/youtube`} aria-current={activeTab === 'youtube' ? 'page' : undefined}>
    YouTube
  </Link>
)}
```

```bash
pnpm --filter @clip-factory/web exec vitest run 'src/app/projects/[projectId]/layout.test.tsx' src/modules/youtube-publishing/delivery/ui/youtube-workspace.test.tsx
```

Expected GREEN: PASS.

- [ ] **REFACTOR 4.3 — Keep feature disable non-destructive.**

Append this test:

```tsx
it('hides the disabled feature without deleting publication data', async () => {
  featureFlags.youtubePublishing = false;
  render(<ProjectLayoutNavigation projectId="project-1" activeTab="editor" />);
  expect(screen.queryByRole('link', { name: 'YouTube' })).not.toBeInTheDocument();
  await testApi.get('/projects/project-1/youtube').expect(404);
  expect(publicationDataService.delete).not.toHaveBeenCalled();
});
```

Rerun the layout test; expected GREEN is PASS.

## Broader verification

- [ ] Run:

```bash
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/application/services/get-youtube-workspace.service.test.ts src/modules/youtube-publishing/converters/api-entity/youtube-workspace.converter.test.ts src/modules/youtube-publishing/delivery/http/youtube-workspace.controller.test.ts src/modules/youtube-publishing/delivery/ui/youtube-workspace.test.tsx
pnpm test:architecture
pnpm test:coverage
pnpm typecheck
pnpm format:check
git diff --check
```

- [ ] Confirm every latest successful rendered clip appears exactly once and no failed/in-progress render is upload-enabled.
- [ ] Inspect localStorage/sessionStorage/IndexedDB in component tests and confirm only the view preference is written.

## Review gate

Approve only when the complete render set appears, deterministic history projection is correct, API hides object keys/internal DTOs, gallery/list/sort are accessible, and local persistence contains only `gallery|list`.

## Suggested commit

```text
feat(youtube): add project publishing workspace
```
