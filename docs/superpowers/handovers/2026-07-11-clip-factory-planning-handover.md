# Clip Factory Planning Handover

## Purpose

Continue reviewing and finalizing the Clip Factory specification and implementation plans. Do not begin application implementation until the plan review below returns a clean PASS.

## User requirements that must remain true

- Use Next.js for the local web application, Docker Compose, Redis, Temporal, MinIO, PostgreSQL/Prisma, and a native Python worker.
- Users submit a browser upload or a permitted local filepath; the output is downloadable vertical clips with audio and burned captions.
- AI highlight discovery is optional. Manual clips do transcription/subtitles/rendering without an AI highlight call.
- OpenAI is the provider. The selected model/reasoning, max credit, max clips, max clip length, per-project/clip cost/model metadata, progress, and ETA are all planned.
- YouTube OAuth/publishing, metadata, thumbnail, per-clip scheduling, and cautious upload recovery are Phase 2.
- Clean Architecture, Clean Code, SOLID, and DRY are mandatory and enforced by the plans/CI.
- Do not use Ruby. Use Python for link checks and any other document-verification scripts. Python used for verification is not an application runtime dependency.
- Do not push. Do not overwrite user changes. The active worktree deliberately contains uncommitted planning edits.

## Primary documents

- [Core design](../specs/2026-07-11-clip-factory-core-design.md)
- [YouTube publishing design](../specs/2026-07-11-clip-factory-youtube-publishing-design.md)
- [Decision log, including user Q&A](../specs/2026-07-11-clip-factory-decision-log.md)
- [Phase 1 master plan](../plans/phase-1-core/master.md) with `task-1.md` through `task-37.md`
- [Phase 2 master plan](../plans/phase-2-youtube-publishing/master.md) with `task-1.md` through `task-16.md`

## Current state

Planning edits are extensive but not committed. Earlier commits already contain the initial specs/plan structure; preserve them. Current modified files include the Core design, every Phase 1 task/master, and Phase 2 master/all tasks.

The plan authors and an independent reviewer have completed multiple repair passes. The following substantive issues are now represented in the plans:

- Entity-oriented application repository ports; Record DTOs, Prisma types, and Entity↔Record conversion stay inside concrete persistence adapters.
- Immutable uploaded source attachment (`bucket`, `key`, version, hash, size) is atomic and transitions the source to `LOCATED`; transcript artifacts preserve complete immutable object references and MLX provenance.
- OpenAI uncertain-call recovery uses Temporal `ActivityError` cause classification, no automatic post-send retry, and a fresh call ID/hash reserved before any acknowledged retry.
- GPT-5.6 Sol is default with GPT-5.5 explicit fallback only; generated-token accounting is single-cap and cache-write policy is explicit.
- Task 13 uses Task-13-owned child workflow contracts, avoiding direct dependencies on Task 14 analysis or Task 23 rendering implementations.
- Linux/Ubuntu CI is planned separately from the macOS native path and includes uv/worker, Compose, migrations, web, fake-worker, Playwright setup/teardown, and no-CD policy.
- OAuth is split into authorization/resume and idempotent result delivery; completion receipts are sanitized and credential material remains in Keychain/native-only boundaries.
- Phase 2 no longer permits generic `UPLOAD_OUTCOME_UNCERTAIN -> UPLOADING` or `FAILED -> READY_TO_UPLOAD`; recovery is evidence-gated and uses locked durable state.
- `sameImmutableUsage` is now explicitly specified in Phase 1 Task 16, with all immutable usage/replay fields compared.

## Most recent repair: strict executable-plan format

The user required no prose-only code-changing checkboxes. The Phase 1 writer reports that every `SCAFFOLD`, `GREEN`, and `REFACTOR` checkbox now has an immediate fenced implementation/verification attachment, and added the missing Task 16 immutable usage comparator/tests. This has **not yet received the final independent re-review**.

## Required next actions

1. Read the relevant Superpowers planning/review skills before changing plans.
2. Run an independent, read-only final review of both plan folders and the specs. Do not accept the authors' own audit as evidence.
3. Specifically verify:
   - every code-changing checkbox has an immediate fenced, executable implementation/verification block;
   - Task 16 defines and tests `sameImmutableUsage` against all immutable fields and locks/validates reservation ownership/hash;
   - Task 13 has no direct import/dependency on later Task 14/23 workflows;
   - generic Phase 2 recovery transitions cannot bypass reconciliation, duplicate-risk acknowledgement, or final-dispatch evidence;
   - Ubuntu CI starts and tears down all dependencies required by Playwright E2E;
   - application ports remain Entity-only and Record DTOs are adapter-private.
4. If any issue remains, repair only the scoped planning documents and rerun the review.
5. When final review is PASS, run Python-only mechanical verification and `git diff --check`.
6. Commit documentation only if the user expects a repository checkpoint; do not push unless explicitly asked.

## Python-only mechanical verification

Run this from the repository root:

```bash
python3 - <<'PY'
from pathlib import Path
import re

roots = [
    (Path('docs/superpowers/plans/phase-1-core'), 37),
    (Path('docs/superpowers/plans/phase-2-youtube-publishing'), 16),
]
files = list(Path('docs/superpowers/specs').glob('*.md'))
for root, expected_task_count in roots:
    tasks = list(root.glob('task-*.md'))
    assert (root / 'master.md').is_file(), f'missing master: {root}'
    assert len(tasks) == expected_task_count, (root, len(tasks))
    files.extend([root / 'master.md', *tasks])

broken = []
for file in files:
    in_fence = False
    for line_number, line in enumerate(file.read_text(encoding='utf-8').splitlines(), 1):
        if line.startswith('```'):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        for target in re.findall(r'\[[^\]]+\]\(([^)]+)\)', line):
            if target.startswith(('http:', 'https:', 'mailto:', '#')):
                continue
            path = target.split('#', 1)[0]
            if path and not (file.parent / path).resolve().exists():
                broken.append(f'{file}:{line_number}: {target}')
    assert not in_fence, f'unbalanced code fence: {file}'

assert not broken, '\n'.join(broken)
print('documentation structure, fences, and prose links: OK')
PY
git diff --check
```

Also run targeted Python scans for structural REDs (`ModuleNotFoundError`, `import FAIL`, `collection FAIL`, `ENOENT`) and unsafe Phase 2 generic recovery arcs. Treat scan false positives in explanatory prose as a reason to refine the pattern, not as a plan defect.

## Prior verification evidence

- Python structure/fence/prose-link validation passed before the latest strict-format repair.
- `git diff --check` passed in every author audit.
- The independent reviewer previously verified all plan folder counts, masters, links, fences, and resolved most architectural blockers; its latest remaining blockers were strict checkbox formatting and the undefined comparator, which the Phase 1 writer reports fixed.

## Suggested continuation prompt

> Continue from `docs/superpowers/handovers/2026-07-11-clip-factory-planning-handover.md`. Use Superpowers planning/review skills. Use Python only for document verification; do not use Ruby. Independently review the strict executable-plan repairs, fix only confirmed remaining planning defects, run the documented Python checks and `git diff --check`, then report whether the plans are genuinely ready for implementation. Do not push.
