# Task 24: Projects Library UI and Application Design Tokens

> **For agentic workers:** Use superpowers:test-driven-development, create-frontend-components, and write-global-styles. Component tests precede JSX/CSS; browser evidence is deferred to Task 34.

## Purpose and traceability

Implement Projects screen and visual/accessibility foundation from design §§5 and 17: persistent library, source health, mode/job/progress/ETA/count/spend, deletion, dark neutral workspace, mint accent, narrow usability.

## Boundaries and files

- Requires Tasks 7, 17, and 23.
- Create: `apps/web/src/styles/tokens.css`
- Create: `apps/web/src/styles/globals.css`
- Modify: `apps/web/src/app/layout.tsx`
- Modify: `apps/web/src/app/page.tsx`
- Create: `apps/web/src/app/projects/[projectId]/page.tsx`
- Create: `apps/web/src/modules/projects/delivery/ui/ProjectCard.tsx`
- Create: `apps/web/src/modules/projects/delivery/ui/ProjectCard.module.css`
- Create: `apps/web/src/modules/projects/delivery/ui/ProjectLibrary.tsx`
- Create: `apps/web/src/modules/projects/delivery/ui/ProjectLibrary.module.css`
- Create: `apps/web/src/modules/projects/delivery/ui/DeleteProjectDialog.tsx`
- Create: `apps/web/src/modules/projects/delivery/ui/DeleteProjectDialog.module.css`
- Create: `apps/web/src/modules/projects/delivery/ui/project.presentation.ts`
- Create: `apps/web/src/modules/projects/delivery/ui/use-project-library.ts`
- Test: `apps/web/src/modules/projects/delivery/ui/ProjectCard.test.tsx`
- Test: `apps/web/src/modules/projects/delivery/ui/ProjectLibrary.test.tsx`
- Test: `apps/web/src/modules/projects/delivery/ui/DeleteProjectDialog.test.tsx`
- Test: `tests/architecture/global-styles.test.mjs`
- Modify: `apps/web/package.json`
- Modify: `pnpm-lock.yaml`
- Pin `@testing-library/user-event` to `14.6.1` without a range.
- Components receive presentation values/callbacks; only server page/hook calls controller/API client.

## RED → GREEN → REFACTOR

- [ ] **RED: render all required project metadata and accessible states.**

```tsx
it('renders source health, mode, progress, eta, counts, and spend without color-only status', () => {
  render(<ProjectLibrary projects={[projectView({ sourceHealth: 'SOURCE_CHANGED', modeLabel: 'Manual — No cloud AI / no API cost', progressLabel: 'Transcribing 42%', etaLabel: 'Estimated 8–12 minutes remaining', candidateCount: 2, renderCount: 1, spendLabel: '$0.00' })]} onDelete={vi.fn()} />);
  expect(screen.getByRole('heading', { name: 'Projects' })).toBeVisible();
  expect(screen.getByText('Source changed')).toBeVisible();
  expect(screen.getByText('Manual — No cloud AI / no API cost')).toBeVisible();
  expect(screen.getByText('Transcribing 42%')).toBeVisible();
  expect(screen.getByText('Estimated 8–12 minutes remaining')).toBeVisible();
  expect(screen.getByText('2 clips · 1 render · $0.00')).toBeVisible();
});
```

- [ ] Create a typed `ProjectLibrary` shell rendering an empty `<main aria-label="Projects">`, verify typecheck passes, then run the test; expect the named persisted-project-card assertion to FAIL because no card is rendered.

- [ ] **GREEN: create explicit presentation props and semantic markup.**

```tsx
export type ProjectCardView = Readonly<{ id: string; name: string; href: string; sourceHealthLabel: string; sourceHealthTone: 'neutral'|'warning'|'danger'; modeLabel: string; progressLabel: string; etaLabel: string|null; candidateCount: number; renderCount: number; spendLabel: string; updatedLabel: string }>;
export function ProjectLibrary({ projects, onDelete }: Readonly<{ projects: readonly ProjectCardView[]; onDelete: (id: string) => void }>) {
  return <main><header className="libraryHeader"><div><h1>Projects</h1><p>Local video projects and processing status.</p></div><a href="/projects/new">New project</a></header>{projects.length === 0 ? <section aria-labelledby="empty-title"><h2 id="empty-title">No projects yet</h2><a href="/projects/new">Create your first project</a></section> : <ul aria-label="Project library">{projects.map((project) => <li key={project.id}><article><a href={project.href}><h2>{project.name}</h2></a><p><span aria-hidden="true">●</span> {project.sourceHealthLabel}</p><p>{project.modeLabel}</p><p>{project.progressLabel}</p>{project.etaLabel ? <p>{project.etaLabel}</p> : null}<p>{project.candidateCount} clips · {project.renderCount} render · {project.spendLabel}</p><time>{project.updatedLabel}</time><button type="button" onClick={() => onDelete(project.id)} aria-label={`Delete ${project.name}`}>Delete</button></article></li>)}</ul>}</main>;
}
```

- [ ] Run `pnpm exec vitest run apps/web/src/modules/projects/delivery/ui/ProjectLibrary.test.tsx`; expect PASS. Add concrete tests for empty/loading/error/retry, 100-character name wrapping, keyboard link order, and ETA absent in waiting states.

- [ ] **RED: deletion dialog behavior.** Assert native dialog has heading `Delete <name>?`, copy `Local filepath sources are never deleted.`, Cancel restores focus, Delete disables during request, failure stays open with alert, success removes card.

- [ ] **GREEN:** controlled `DeleteProjectDialog` receives `open`, `projectName`, `busy`, `error`, `onCancel`, `onConfirm`; use `<dialog>`, labeled buttons, `aria-describedby`, and no deletion policy. Hook calls DELETE once and refreshes presentation list.

```bash
# GREEN attachment: implement the exact files/functions named above.
pnpm exec vitest run apps/web/src/modules/projects/delivery/ui
# Expected: PASS
```

- [ ] **RED: token contract test** reads `tokens.css` and asserts mint focus token, dark surfaces, spacing scale, 1024 breakpoint custom media query usage, and reduced-motion rule.

- [ ] **GREEN: create global foundation.**

```css
:root {
  color-scheme: dark;
  --color-canvas: #0b0f0e;
  --color-surface: #121816;
  --color-surface-raised: #19221f;
  --color-text: #f1f7f4;
  --color-text-muted: #9fb0aa;
  --color-accent: #63e6be;
  --color-accent-contrast: #07110d;
  --color-danger: #ff7b7b;
  --color-warning: #f4c95d;
  --color-focus: #8cf3d2;
  --space-1: 0.25rem; --space-2: 0.5rem; --space-3: 0.75rem; --space-4: 1rem; --space-6: 1.5rem; --space-8: 2rem;
  --radius-control: 0.5rem; --radius-panel: 0.75rem;
}
*, *::before, *::after { box-sizing: border-box; }
html { font-family: Inter, ui-sans-serif, system-ui, sans-serif; background: var(--color-canvas); color: var(--color-text); }
body { margin: 0; min-width: 320px; }
button, input, select, textarea { font: inherit; }
:focus-visible { outline: 2px solid var(--color-focus); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; } }
```

- [ ] **REFACTOR:** component CSS uses tokens; at `<1024px` cards become one column and actions wrap, without global overflow hiding. Run axe component smoke with zero serious violations.

```bash
# REFACTOR attachment: implement the exact files/functions named above.
pnpm exec vitest run apps/web/src/modules/projects/delivery/ui
# Expected: PASS
```

## Verification and commit

```bash
pnpm exec vitest run apps/web/src/modules/projects/delivery/ui
pnpm --filter @clip-factory/web lint
pnpm --filter @clip-factory/web typecheck
pnpm --filter @clip-factory/web build
git diff --check
```

Expected: semantic, focus-visible project library works at desktop/narrow widths and deletion never implies deleting local media.

**Suggested commit:** `feat: add accessible projects library`
