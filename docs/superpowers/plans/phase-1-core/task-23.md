# Task 23: Isolate Render Failures and Deliver Individual or Archive Downloads

> **For agentic workers:** Use superpowers:test-driven-development. A batch result is a collection of independent clip outcomes, never one all-or-nothing status.

## Purpose and traceability

Implement design §§18 and 23 plus acceptance criterion 10: selected/all rendering, successful sibling availability, failed-only retry, scoped individual downloads, and successful-output ZIP/SRT archive.

## Boundaries and files

- Requires Tasks 9, 13, and 22. Task 13 owns and registers the stable `RenderBatchChildWorkflow` contract; this task supplies its `RenderBatchExecutorPort` implementation behind that shell. Completion returns the parent to `AWAITING_REVIEW`; this task never imports `ProjectWorkflow`.
- Create: `apps/worker/src/clip_factory/application/execute_render_batch.py`
- Create: `apps/worker/src/clip_factory/ports/render_batch_executor.py`
- Create: `apps/worker/src/clip_factory/application/build_archive.py`
- Create: `apps/worker/src/clip_factory/ports/archive_builder.py`
- Create: `apps/worker/src/clip_factory/adapters/archive/zip_archive_builder.py`
- Test: `apps/worker/tests/entrypoints/temporal/test_render_batch_workflow.py`
- Test: `apps/worker/tests/application/test_build_archive.py`
- Test: `apps/worker/tests/adapters/archive/test_zip_archive_builder.py`
- Create: `apps/web/src/modules/rendering/application/services/queue-render-batch.service.ts`
- Create: `apps/web/src/modules/rendering/application/services/retry-failed-render.service.ts`
- Create: `apps/web/src/modules/rendering/application/services/get-download.service.ts`
- Create: `apps/web/src/modules/rendering/application/services/create-archive.service.ts`
- Create: `apps/web/src/modules/rendering/application/ports/archive-builder.port.ts`
- Create: `apps/web/src/modules/rendering/delivery/http/download.controller.ts`
- Create: `apps/web/src/modules/rendering/delivery/http/archive.controller.ts`
- Create: `apps/web/src/app/api/renders/[renderId]/download/route.ts`
- Create: `apps/web/src/app/api/projects/[projectId]/downloads/archive/route.ts`
- Test: `apps/web/src/modules/rendering/application/services/queue-render-batch.service.test.ts`
- Test: `apps/web/src/modules/rendering/application/services/retry-failed-render.service.test.ts`
- Test: `apps/web/src/modules/rendering/application/services/get-download.service.test.ts`
- Test: `apps/web/src/modules/rendering/application/services/create-archive.service.test.ts`
- Test: `apps/web/src/modules/rendering/delivery/http/download.controller.test.ts`
- Test: `apps/web/src/modules/rendering/delivery/http/archive.controller.test.ts`
- Test: `tests/integration/rendering/downloads.test.ts`
- ZIP implementation lives in storage adapter; application passes object references and safe generated names.

## RED → GREEN → REFACTOR

- [ ] **RED: time-skipping sibling failure.** Three child renders `[success, failure, success]` produce batch `{completed:2,failed:1}`, two downloadable callbacks, and no cancellation of successful children.

- [ ] Create compile-safe render-batch workflow/payload shells whose run returns an empty result set, verify collection passes, then run the test; expect the named three-independent-results assertion to FAIL with zero results.

- [ ] **GREEN: bind Task 13's child-workflow shell to independent execution.** Implement `RenderBatchExecutorPort.execute(RenderBatchChildInput) -> RenderBatchChildResult` in `ports/render_batch_executor.py` and `ExecuteRenderBatch.execute` in `application/execute_render_batch.py`; register that executor in Task 13's `RenderBatchChildWorkflow` composition. It starts one `RenderWorkflow` per render, captures each outcome independently, and returns `RenderBatchChildResult` without importing `ProjectWorkflow`. Run `uv run --directory apps/worker pytest tests/entrypoints/temporal/test_render_batch_workflow.py -q`; expect PASS.

```python
class RenderBatchExecutor:
    async def execute(self, payload: RenderBatchChildInput) -> RenderBatchChildResult:
        handles = [workflow.start_child_workflow(RenderWorkflow.run, item, id=f"render-{item.render_id}") for item in payload.renders]
        results: list[RenderOutcome] = []
        for item, handle in zip(payload.renders, handles, strict=True):
            try:
                results.append(RenderOutcome(item.render_id, "COMPLETED", await handle, None))
            except ApplicationError as error:
                results.append(RenderOutcome(item.render_id, "FAILED", None, sanitize_render_error(error)))
        return RenderBatchChildResult(tuple(results))
```

- [ ] Run `uv run --directory apps/worker pytest tests/entrypoints/temporal/test_render_batch_workflow.py -q`; expect PASS.

- [ ] **RED: failed-only retry test.** Completed render IDs are rejected with `RENDER_NOT_FAILED`; failed render produces a new Render ID carrying the identical immutable snapshot hash; editing requires a normal new render, not retry.

- [ ] **GREEN:** `RetryFailedRenderService` requires failed row, copies snapshot/encoder into a new queued row with `retryOfRenderId`, signals only that clip, and returns new ID. Add migration `20260711000200_render_retry` with nullable self-reference and index.

```bash
# GREEN attachment: implement the exact files/functions named above.
uv run --directory apps/worker pytest tests/entrypoints/temporal/test_render_batch_workflow.py tests/application/test_build_archive.py -q
# Expected: PASS
```

- [ ] **RED: download/archive test.** Individual completed render returns a 300-second scoped presigned URL; failed/running returns 409. Archive includes only successful MP4 and requested SRT entries named `001-<sanitized-title>.mp4`, never path traversal, and persists an object reference.

- [ ] **GREEN:** `GetDownloadService` verifies project ownership/status then calls `DownloadUrlPort.presign(key,300)`. `CreateArchiveService` sorts accepted clips by filmstrip order, sanitizes title to lowercase ASCII hyphen max 80, adds successful MP4 and optional generated SRT, writes `projects/<projectId>/archives/<archiveId>.zip`, and returns a 300-second URL.

```bash
# GREEN attachment: implement the exact files/functions named above.
uv run --directory apps/worker pytest tests/entrypoints/temporal/test_render_batch_workflow.py tests/application/test_build_archive.py -q
# Expected: PASS
```

- [ ] **REFACTOR:** archive builder streams objects and ZIP output without whole-file memory buffering, aborts multipart archive on cancellation, and idempotently reuses same archive request hash. Test empty-success batch returns `NO_SUCCESSFUL_RENDERS`.

```bash
# REFACTOR attachment: implement the exact files/functions named above.
uv run --directory apps/worker pytest tests/entrypoints/temporal/test_render_batch_workflow.py tests/application/test_build_archive.py -q
# Expected: PASS
```

## Verification and commit

```bash
uv run --directory apps/worker pytest tests/entrypoints/temporal/test_render_batch_workflow.py tests/application/test_build_archive.py -q
pnpm exec vitest run apps/web/src/modules/rendering
pnpm exec vitest run tests/integration/rendering/downloads.test.ts
pnpm test:architecture
git diff --check
```

Expected: successful siblings download immediately, retry targets only failed snapshots, and archives contain no failed output.

**Suggested commit:** `feat: isolate render failures and deliver outputs`
