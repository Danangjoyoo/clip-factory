# Task 15: Semantic Transcript Windows and OpenAI Highlight Analysis

> **For agentic workers:** Use superpowers:test-driven-development. Use only the deterministic fake in default tests; real requests remain an opt-in smoke command.

## Purpose and traceability

Implement design §§13.1–13.2 and failure rules: quality-first overlapping windows, fixed rubric plus optional instruction, Responses Structured Outputs, strict candidate validation, global ranking, and budget-permitted retry.

## Boundaries and files

- Requires Tasks 5, 12, and 14.
- Create: `apps/worker/src/clip_factory/domain/highlight.py`
- Create: `apps/worker/src/clip_factory/application/build_transcript_windows.py`
- Create: `apps/worker/src/clip_factory/application/analyze_highlights.py`
- Create: `apps/worker/src/clip_factory/ports/highlight_model.py`
- Create: `apps/worker/src/clip_factory/ports/model_access.py`
- Create: `apps/worker/src/clip_factory/application/check_model_access.py`
- Create: `apps/worker/src/clip_factory/adapters/openai/client_models.py`
- Create: `apps/worker/src/clip_factory/adapters/openai/model_access_adapter.py`
- Create: `apps/worker/src/clip_factory/adapters/openai/highlight_adapter.py`
- Create: `apps/worker/src/clip_factory/adapters/openai/fake_highlight_adapter.py`
- Create: `apps/worker/src/clip_factory/adapters/openai/prompts/highlights-v1.txt`
- Create: `apps/worker/src/clip_factory/entrypoints/temporal/activities/highlight_activities.py`
- Create: `apps/worker/src/clip_factory/entrypoints/temporal/mappers/highlight_mapper.py`
- Test: `apps/worker/tests/domain/test_highlight.py`
- Test: `apps/worker/tests/application/test_build_transcript_windows.py`
- Test: `apps/worker/tests/application/test_analyze_highlights.py`
- Test: `apps/worker/tests/application/test_check_model_access.py`
- Test: `apps/worker/tests/adapters/openai/test_highlight_adapter.py`
- Test: `apps/worker/tests/adapters/openai/test_model_access_adapter.py`
- Test: `apps/worker/tests/adapters/openai/test_fake_highlight_adapter.py`
- Test: `apps/worker/tests/entrypoints/temporal/activities/test_highlight_activities.py`
- Test: `apps/worker/tests/smoke/test_openai.py`
- Create: `tests/fixtures/highlights/fake-response.json`
- Modify: `apps/worker/pyproject.toml`
- Modify: `apps/worker/uv.lock`
- Pin `openai==2.45.0` without a range.
- OpenAI SDK/Responses objects and enums remain adapter-only; service sees `HighlightModelPort` Entity/domain values.

## RED → GREEN → REFACTOR

- [ ] **RED: exact window construction test.** Given sentence/silence boundaries at `[0,400000,800000,1200000,1600000]`, maximum 1200000 ms and overlap target 120000 ms, assert windows `[0,1200000]` and `[800000,1600000]`; no word is split and every word has coverage.

- [ ] Run `uv run --directory apps/worker pytest tests/application/test_build_transcript_windows.py -q`; expect import FAIL.

- [ ] **GREEN: create boundary-only windowing.**

```python
def build_windows(boundaries_ms: Sequence[int], duration_ms: int, maximum_ms: int = 1_200_000, overlap_ms: int = 120_000) -> Sequence[TimeRange]:
    windows: list[TimeRange] = []
    start = 0
    while start < duration_ms:
        eligible_ends = [value for value in boundaries_ms if start < value <= min(duration_ms, start + maximum_ms)]
        end = max(eligible_ends, default=min(duration_ms, start + maximum_ms))
        windows.append(TimeRange(start, end))
        if end == duration_ms: break
        eligible_starts = [value for value in boundaries_ms if start < value <= end - overlap_ms]
        start = max(eligible_starts, default=end)
    return tuple(windows)
```

- [ ] Run window tests; expect PASS. Add table rows for short transcript, one long sentence, exact boundary, duplicate boundaries, and silence-derived boundary.

- [ ] **RED: assert provider request privacy and schema.**

```python
async def test_openai_request_contains_only_prompt_transcript_and_instruction() -> None:
    client = RecordingResponsesClient(valid_response())
    adapter = OpenAIHighlightAdapter(client)
    await adapter.extract(window_input(text="Useful transcript", instruction="Prefer surprising advice", model="gpt-5.6-sol", reasoning="high"))
    request = client.requests[0]
    assert request["model"] == "gpt-5.6-sol"
    assert request["reasoning"] == {"effort": "high"}
    assert request["prompt_cache_options"] == {"mode": "explicit"}
    assert request["text"]["format"]["type"] == "json_schema"
    serialized = json.dumps(request)
    assert "prompt_cache_breakpoint" not in serialized
    assert "Useful transcript" in serialized
    assert "Prefer surprising advice" in serialized
    assert "/Users/" not in serialized
    assert "objectKey" not in serialized
    assert "media" not in serialized.lower()
```

- [ ] Run adapter test; expect import FAIL.

- [ ] **GREEN:** before any reservation/provider response call, `CheckModelAccess` invokes a fakeable `ModelAccessPort` backed by OpenAI `models.retrieve(modelId)` and returns `AVAILABLE`, `NOT_ENTITLED`, `NOT_FOUND`, or sanitized `CHECK_UNAVAILABLE`; it performs no inference and never selects a fallback. Call `client.responses.create` with `store=False`, fixed `highlights-v1` system prompt naming all seven rubric dimensions, selected model/effort, and strict `highlight-response` JSON Schema. For `gpt-5.6-sol`, send `prompt_cache_options={"mode":"explicit"}` and no breakpoints so cache reads/writes are disabled; omit unsupported cache options for `gpt-5.5`. Set `max_output_tokens` to Task 3 profile `maxGeneratedTokens`; this one cap includes reasoning, visible output, and formatting tokens. Convert response Client DTOs explicitly and retain response ID/usage; never include path, media probe, project name, or object reference.

- [ ] Run adapter tests; expect PASS.

- [ ] Add a failing access matrix: a fake 200 for each allowlisted ID enables only that ID; 403/404 disables it with explanatory presentation metadata; missing key reports `CHECK_UNAVAILABLE`; a transient check failure blocks a new paid call rather than guessing; selecting unavailable `gpt-5.6-sol` never invokes `gpt-5.5`. Implement the port/adapter/service and rerun `tests/application/test_check_model_access.py` plus `tests/adapters/openai/test_model_access_adapter.py`; expect PASS with zero Responses calls.

- [ ] **RED: validate/rank candidates.** Reject end before start, outside window/source, over max duration, duplicate rank, score outside `0..1000000`, more than requested maximum, and malformed output. Accept fewer/zero candidates. Prefer at least 15000 ms but allow a shorter complete thought.

- [ ] **GREEN:** validate every field, deduplicate candidates with intersection-over-union above `0.8` by keeping higher overall score, then globally sort `overallScore desc`, `startMs asc`, assign contiguous ranks, and truncate to `maximumClips`.

- [ ] **RED: distinguish safe and ambiguous paid failures.** A failure before request bytes are written returns `PRE_SEND_FAILURE` and may consume a planned retry; a timeout/read error after send or worker loss returns `PAID_CALL_UNCERTAIN`, enters a no-ETA wait, and schedules no provider activity. A received invalid Structured Output first records response ID and usage durably, then may reserve one validation retry.

- [ ] **GREEN: make each paid activity a single attempt and add explicit uncertain retry.**

```python
PAID_ACTIVITY_OPTIONS = {
    "start_to_close_timeout": timedelta(minutes=30),
    "heartbeat_timeout": timedelta(seconds=30),
    "retry_policy": RetryPolicy(maximum_attempts=1),
}

@workflow.signal
def retry_uncertain_paid_call(self, acknowledge_possible_prior_spend: bool) -> None:
    if acknowledge_possible_prior_spend:
        self._uncertain_retry_approved = True

async def run_paid_call(self, request: HighlightRequest) -> HighlightResponse:
    try:
        return await workflow.execute_activity(call_openai_once, request, **PAID_ACTIVITY_OPTIONS)
    except ApplicationError as error:
        if error.type == "OPENAI_PRE_SEND_FAILURE":
            return await self.run_reserved_planned_retry(request)
        self._state = "PAID_CALL_UNCERTAIN"
        self._uncertain_retry_approved = False
        await workflow.wait_condition(lambda: self._uncertain_retry_approved or self._cancelled)
        if self._cancelled:
            raise CancelledError("analysis cancelled after uncertain paid call")
        reconciled = await workflow.execute_activity(reconcile_paid_call, ReconcilePaidCallInput(request.call_id, request.request_hash, request.response_object_key), start_to_close_timeout=timedelta(minutes=2), retry_policy=RetryPolicy(maximum_attempts=3))
        if reconciled is not None:
            return reconciled
        await workflow.execute_activity(reserve_uncertain_retry, request.call_id, start_to_close_timeout=timedelta(seconds=30))
        return await workflow.execute_activity(call_openai_once, request.with_new_call_id(), **PAID_ACTIVITY_OPTIONS)
```

`call_openai_once` marks the reservation `SENT` immediately before invoking the SDK. Connection/configuration failures before `SENT` map to `OPENAI_PRE_SEND_FAILURE`; timeouts, EOF, worker crash, and any exception after `SENT` map to `OPENAI_OUTCOME_UNCERTAIN`. It does not claim provider idempotency. After a response arrives it writes `{callId,requestHash,providerResponseId,normalizedUsage,validatedResponse}` to deterministic MinIO key `projects/<projectId>/analysis/<analysisRunId>/calls/<callId>.json`, then posts that object reference to Task 16. Task 16 atomically creates usage and marks the reservation completed before acknowledging. `reconcile_paid_call` first queries the idempotent internal callback by call ID/hash; if completed, it reads the recorded artifact. If not completed, it heads the deterministic MinIO key and replays the callback from that artifact. Only a confirmed absence from both stores permits a fresh reservation after user acknowledgement.

- [ ] Add two time-skipping tests: (1) provider response artifact and Task 16 transaction complete but callback HTTP acknowledgement is lost; acknowledgement signal reconciles the recorded result and provider call count stays one; (2) worker loss after `SENT` with no durable response in PostgreSQL or MinIO remains `PAID_CALL_UNCERTAIN`, performs zero automatic provider retries, and creates a second call only after explicit acknowledgement plus fresh reservation.

- [ ] **REFACTOR:** deterministic fake reads `tests/fixtures/highlights/fake-response.json`; opt-in command is `OPENAI_SMOKE=1 OPENAI_MAX_SPEND_MICROUSD=10000 uv run --directory apps/worker pytest tests/smoke/test_openai.py -q`, skipped otherwise. Add a time-skipping test that restarts the worker after an ambiguous failure and proves provider call count remains one until the acknowledgement signal.

## Verification and commit

```bash
uv run --directory apps/worker pytest tests/application/test_build_transcript_windows.py tests/application/test_analyze_highlights.py tests/adapters/openai -q
uv run --directory apps/worker lint-imports
pnpm test:contracts
git diff --check
```

Expected: fake analysis is deterministic, candidate count is bounded, and serialized requests contain transcript/instruction but no local media/path metadata.

**Suggested commit:** `feat: add budgeted openai highlight analysis`
