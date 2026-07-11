# Task 28: Caption, Frame, Metadata Inspectors and Platform Guides

> **For agentic workers:** Use superpowers:test-driven-development and create-frontend-components. Inspector controls are controlled, labeled, validated, and render-spec-backed.

## Purpose and traceability

Complete design §§14–17 editor controls: caption correction/style, title, focal override/crop, metadata/provenance, and YouTube/Instagram/TikTok safe-area overlays.

## Boundaries and files

- Requires Tasks 18–19 and 27.
- Create: `apps/web/src/modules/clips/delivery/ui/InspectorTabs.tsx`
- Create: `apps/web/src/modules/clips/delivery/ui/CaptionInspector.tsx`
- Create: `apps/web/src/modules/clips/delivery/ui/FrameInspector.tsx`
- Create: `apps/web/src/modules/clips/delivery/ui/MetadataInspector.tsx`
- Create: `apps/web/src/modules/clips/delivery/ui/SafeAreaOverlay.tsx`
- Create: `apps/web/src/modules/clips/delivery/ui/Inspector.module.css`
- Create: `apps/web/src/modules/clips/delivery/ui/use-clip-edit.ts`
- Test: `apps/web/src/modules/clips/delivery/ui/InspectorTabs.test.tsx`
- Test: `apps/web/src/modules/clips/delivery/ui/CaptionInspector.test.tsx`
- Test: `apps/web/src/modules/clips/delivery/ui/FrameInspector.test.tsx`
- Test: `apps/web/src/modules/clips/delivery/ui/MetadataInspector.test.tsx`
- Test: `apps/web/src/modules/clips/delivery/ui/SafeAreaOverlay.test.tsx`
- Test: `apps/web/src/modules/clips/delivery/ui/use-clip-edit.test.tsx`
- Local font options and guides come only from Task 3 catalog presentation; no arbitrary font/file input.

## RED → GREEN → REFACTOR

- [ ] **RED: caption form contract.** Assert text corrections, font, size, four colors, vertical position, max words/line, active emphasis, and title controls have labels/current values; invalid fields show related errors; Save emits complete versioned edit.

- [ ] Create typed inspector shells that render read-only labels, verify typecheck passes, then run the test; expect the named caption-edit callback assertion to FAIL because the shell never calls `onChange`.

- [ ] **GREEN:** create controlled form with fonts `Inter`, `Arial`, `Helvetica Neue`; number bounds from Task 19; native color input plus alpha text field; cue words keyed by ID; one Save callback receives full `CaptionDocumentV1`, `CaptionStyleV1`, and nullable title. Do not mutate props.

```bash
# GREEN attachment: implement the exact files/functions named above.
pnpm exec vitest run apps/web/src/modules/clips/delivery/ui/{CaptionInspector,FrameInspector,MetadataInspector,SafeAreaOverlay}.test.tsx
# Expected: PASS
```

- [ ] Run `pnpm exec vitest run apps/web/src/modules/clips/delivery/ui/CaptionInspector.test.tsx`; expect PASS.

- [ ] **RED: safe-area guide switch.** Each preset draws four noninteractive edges at exact Task 3 normalized coordinates; switching guide changes preview overlay only and persists selected platform, never canvas size; status text names selected guide.

- [ ] **GREEN: create overlay.**

```tsx
export function SafeAreaOverlay({ preset }: Readonly<{ preset: PlatformPresetView }>) {
  const style = { top:`${preset.safeArea.top*100}%`, right:`${preset.safeArea.right*100}%`, bottom:`${preset.safeArea.bottom*100}%`, left:`${preset.safeArea.left*100}%` };
  return <div className="safeArea" style={style} aria-hidden="true" data-preset={preset.id} />;
}
```

- [ ] Run `pnpm exec vitest run apps/web/src/modules/clips/delivery/ui/SafeAreaOverlay.test.tsx`; expect PASS and assert canvas aspect remains `9/16`.

- [ ] **RED: frame override.** Clicking/keyboard moving focal marker emits integer micros, reset restores automatic track, out-of-safe crop shows error, and low-confidence automatic fallback label is visible.

- [ ] **GREEN:** preview click converts bounding rect coordinates with clamped half-up micros; arrow keys ±1000 micros, Shift ±10000; reset calls Task 18 service with `manualFocalPoint:null`; crop path interpolates current track for playhead.

```bash
# GREEN attachment: implement the exact files/functions named above.
pnpm exec vitest run apps/web/src/modules/clips/delivery/ui/{CaptionInspector,FrameInspector,MetadataInspector,SafeAreaOverlay}.test.tsx
# Expected: PASS
```

- [ ] **RED/GREEN metadata:** read-only tab lists origin, analysis/model/reasoning/prompt/pricing, rank/scores, exact or allocated cost label, boundaries, algorithm/spec versions, render timing/encoder, object metadata without raw object key/path. Manual clip displays `$0.00 OpenAI selection cost` and no rank.

- [ ] **REFACTOR:** tabs follow ARIA automatic activation pattern, arrow/Home/End keys, persistent focus, no nested cards, long transcript text wraps, and changes debounce with explicit Saving/Saved/Error states.

```bash
# REFACTOR attachment: implement the exact files/functions named above.
pnpm exec vitest run apps/web/src/modules/clips/delivery/ui/{CaptionInspector,FrameInspector,MetadataInspector,SafeAreaOverlay}.test.tsx
# Expected: PASS
```

## Verification and commit

```bash
pnpm exec vitest run apps/web/src/modules/clips/delivery/ui/{CaptionInspector,FrameInspector,MetadataInspector,SafeAreaOverlay}.test.tsx
pnpm --filter @clip-factory/web typecheck
pnpm --filter @clip-factory/web build
git diff --check
```

Expected: every edit maps to shared spec, all guides are selectable, and metadata labels exact versus allocated costs truthfully.

**Suggested commit:** `feat: add editor inspectors and safe-area guides`
