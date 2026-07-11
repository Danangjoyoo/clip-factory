# Task 19: Caption Documents, Styles, and Normalized Render Specification

> **For agentic workers:** Use superpowers:test-driven-development. Freeze the normalized render contract before preview or full rendering code.

## Purpose and traceability

Implement design §§15 and 18: source-language editable captions, controlled local styling, title, safe-area constraints, and one versioned specification shared by browser preview and worker output.

## Boundaries and files

- Requires Tasks 3, 5, 12, and 18.
- Create: `apps/web/src/modules/clips/domain/timecode.ts`
- Create: `apps/web/src/modules/clips/domain/caption.ts`
- Create: `apps/web/src/modules/clips/application/dto/entity/caption-document-entity.dto.ts`
- Create: `apps/web/src/modules/clips/application/dto/entity/caption-style-entity.dto.ts`
- Create: `apps/web/src/modules/clips/application/dto/entity/render-spec-entity.dto.ts`
- Create: `apps/web/src/modules/clips/application/services/build-caption-document.service.ts`
- Create: `apps/web/src/modules/clips/application/services/update-clip-edit.service.ts`
- Create: `apps/web/src/modules/clips/adapters/persistence/dto/record/clip-edit-record.dto.ts`
- Create: `apps/web/src/modules/clips/delivery/http/dto/api/clip-edit-api.dto.ts`
- Create: `apps/web/src/modules/clips/delivery/http/clip-edit.controller.ts`
- Create: `apps/web/src/modules/clips/converters/api-entity/clip-edit.converter.ts`
- Create: `apps/web/src/modules/clips/adapters/persistence/converters/clip-edit.converter.ts`
- Create: `apps/web/src/modules/clips/converters/entity-contract/render-spec.converter.ts`
- Create: `apps/web/src/app/api/clips/[clipId]/edit/route.ts`
- Test: `apps/web/src/modules/clips/domain/timecode.test.ts`
- Test: `apps/web/src/modules/clips/domain/caption.test.ts`
- Test: `apps/web/src/modules/clips/application/services/build-caption-document.service.test.ts`
- Test: `apps/web/src/modules/clips/application/services/update-clip-edit.service.test.ts`
- Test: `apps/web/src/modules/clips/converters/api-entity/clip-edit.converter.test.ts`
- Test: `apps/web/src/modules/clips/adapters/persistence/converters/clip-edit.converter.test.ts`
- Test: `apps/web/src/modules/clips/converters/entity-contract/render-spec.converter.test.ts`
- Create: `apps/worker/src/clip_factory/domain/render_spec.py`
- Create: `apps/worker/src/clip_factory/entrypoints/contracts/render_spec_mapper.py`
- Test: `apps/worker/tests/domain/test_render_spec.py`
- Test: `apps/worker/tests/entrypoints/contracts/test_render_spec_mapper.py`
- Exact public types: `CaptionDocumentV1`, `CaptionStyleV1`, `FrameConfigurationV1`, `RenderSpecEntityDto`.

## Fixed types

```ts
export type CaptionWord = Readonly<{ id: string; text: string; startMs: number; endMs: number }>;
export type CaptionCue = Readonly<{ id: string; startMs: number; endMs: number; words: readonly CaptionWord[] }>;
export type CaptionDocumentV1 = Readonly<{ version: 1; languageTag: string; cues: readonly CaptionCue[] }>;
export type CaptionStyleV1 = Readonly<{ version: 1; fontFamily: 'Inter'|'Arial'|'Helvetica Neue'; fontSizePx: number; textColor: string; outlineColor: string; backgroundColor: string; activeWordColor: string; verticalPositionMicros: number; maxWordsPerLine: number; activeWordEmphasis: boolean }>;
export type RenderSourceSnapshotV1 =
  | Readonly<{ kind:'LOCAL_FILE'; sourceAssetId:string; fingerprint:string; sizeBytes:number; modifiedAt:string }>
  | Readonly<{ kind:'BROWSER_UPLOAD'; sourceAssetId:string; object:Readonly<{ bucket:'clip-factory'; key:string; versionId:string|null; sha256:string }> }>;
```

## RED → GREEN → REFACTOR

- [ ] **RED: precise timecode tests.** `01:02:03.456` parses to `3723456`; formatting reverses it; hours over 99, missing milliseconds, invalid minutes/seconds, negative, and whitespace fail with `INVALID_TIMECODE`.

- [ ] Create compile-safe `parseTimecode`/`formatTimecode` shells returning `0`/`00:00:00.000`, verify typecheck passes, then run the test; expect the named `01:02:03.456` assertion to FAIL with `0` instead of `3723456`.

- [ ] **GREEN: create strict parser/formatter.**

```ts
const TIMECODE = /^(\d{2}):(\d{2}):(\d{2})\.(\d{3})$/u;
export function parseTimecode(value: string): number {
  const match = TIMECODE.exec(value);
  if (!match) throw new ClipEditError('INVALID_TIMECODE');
  const [hours, minutes, seconds, millis] = match.slice(1).map(Number) as [number, number, number, number];
  if (hours > 99 || minutes > 59 || seconds > 59) throw new ClipEditError('INVALID_TIMECODE');
  return (((hours * 60 + minutes) * 60 + seconds) * 1000) + millis;
}
export function formatTimecode(value: number): string {
  if (!Number.isInteger(value) || value < 0 || value > 359_999_999) throw new ClipEditError('INVALID_TIMECODE');
  const hours = Math.floor(value / 3_600_000);
  const minutes = Math.floor((value % 3_600_000) / 60_000);
  const seconds = Math.floor((value % 60_000) / 1000);
  return `${hours.toString().padStart(2,'0')}:${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}.${(value % 1000).toString().padStart(3,'0')}`;
}
```

- [ ] Run `pnpm exec vitest run apps/web/src/modules/clips/domain/timecode.test.ts`; expect PASS.

- [ ] **RED: caption copy/edit test.** Words intersecting `[1000,4000)` are copied, clipped to range, grouped at max six words and max 2500 ms per cue; editing text preserves word timing/ID; blank word and overlapping cue fail.

- [ ] **GREEN:** scan sorted transcript words, select `word.endMs > start && word.startMs < end`, clamp, group when adding a word would exceed either bound, and create UUIDs through injected `IdGenerator`. Update accepts text only for known word IDs and then validates monotonic timing.

```bash
# GREEN attachment: implement the exact files/functions named above.
pnpm exec vitest run apps/web/src/modules/clips/domain apps/web/src/modules/clips/application apps/web/src/modules/clips/converters
# Expected: PASS
```

- [ ] **RED: complete style validation table.** Fonts outside the three-item set, size outside `24..160`, non-`#RRGGBBAA` colors, vertical position outside selected safe-area top/bottom, words per line outside `1..12`, title over 120 chars, and crop coordinates outside micros range each produce an exact typed error.

- [ ] **GREEN:** implement pure `validateClipEdit(edit, platformCatalog)` and build `RenderSpecEntityDto` with `version:'1.0.0'`, canvas 1080×1920, immutable `RenderSourceSnapshotV1`, clip range, crop track, caption document, style, nullable title, encoder choice, and platform preset. The local branch contains only source ID plus fingerprint/size/mtime; the upload branch contains the exact version/hash object reference. Neither branch contains a path, presigned URL, or mutable “latest object” lookup. Convert every enum/optional field into contract RenderSpec with direct tests.

```bash
# GREEN attachment: implement the exact files/functions named above.
pnpm exec vitest run apps/web/src/modules/clips/domain apps/web/src/modules/clips/application apps/web/src/modules/clips/converters
# Expected: PASS
```

- [ ] **REFACTOR:** browser presentation model receives normalized values only; no component reads Record DTO or raw JSONB. Python contract mapper rejects unknown versions/enums and returns immutable domain dataclasses. Contract tests JSON-serialize both source branches and reject `/Users/`, `file://`, `http://`, `https://`, `resolvedPath`, and `candidatePath`.

```bash
# REFACTOR attachment: implement the exact files/functions named above.
pnpm exec vitest run apps/web/src/modules/clips/domain apps/web/src/modules/clips/application apps/web/src/modules/clips/converters
# Expected: PASS
```

## Verification and commit

```bash
pnpm exec vitest run apps/web/src/modules/clips/domain apps/web/src/modules/clips/application apps/web/src/modules/clips/converters
uv run --directory apps/worker pytest tests/domain/test_render_spec.py tests/entrypoints/contracts/test_render_spec_mapper.py -q
pnpm test:contracts
pnpm test:architecture
git diff --check
```

Expected: time/caption/style invariants are exact and browser/worker consume the same versioned spec.

**Suggested commit:** `feat: add normalized caption and render specification`
