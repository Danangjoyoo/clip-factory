# Task 15: Credential Containment, Redaction, Port Parity, and Diagnostics Gates

> **Implementation mode:** Complete after Tasks 7–14. This task adds executable cross-cutting security evidence; it does not relax a functional test to make scanning pass.

## Purpose

Prove that OAuth/token material stays inside native adapter memory/Keychain, provider errors are sanitized before persistence/presentation, production adapters and fakes obey the same contracts, diagnostics are allowlisted, and architecture/CI reject every protected-boundary leak.

## Requirements and traceability

- YouTube design §§9, 14, 16–19 and acceptance 1, 11–14: token absence from every forbidden sink, revoke/delete history, SDK/DTO boundaries, paid-call uncertainty, final-upload uncertainty/reconciliation, contract parity, redaction.
- Core design §§24, 28, 30.7: redacted structured logs/diagnostics, forbidden-import/cycle/generated-leak tests.
- Decision log decisions 50–51, 60–62: deterministic fakes, no secrets/CD, no automatic ambiguous paid-call retry.

## Clean Architecture ownership

- **Affected layers:** security test harnesses, adapter error/redaction implementations, diagnostics exporter, architecture scanners/config.
- **No new business behavior:** failures discovered here are fixed at their owning boundary with a RED test.
- **Fake parity:** shared contract suites assert public port behavior, not fake internals.
- **Fail closed:** unexpected fields/provider bodies/backend types are discarded or rejected, never copied “for debugging.”

## Files

- Create: `tests/integration/youtube-publishing/credential-containment.test.ts`
- Create: `apps/worker/tests/security/test_youtube_credential_containment.py`
- Create: `apps/worker/tests/contracts/test_credential_vault_contract.py`
- Create: `apps/worker/tests/contracts/test_youtube_publisher_contract.py`
- Create: `apps/worker/tests/contracts/test_metadata_generator_contract.py`
- Create: `apps/web/src/modules/youtube-publishing/security/youtube-boundary.test.ts`
- Create: `apps/web/src/modules/youtube-publishing/security/youtube-diagnostics.test.ts`
- Create: `apps/web/src/modules/youtube-publishing/security/scan-runtime-sinks.ts`
- Create: `apps/worker/src/clip_factory/adapters/youtube/sanitized_google_error.py`
- Modify: `apps/worker/src/clip_factory/adapters/youtube/google_oauth_gateway.py`
- Modify: `apps/worker/src/clip_factory/adapters/youtube/youtube_publisher.py`
- Modify: `apps/worker/src/clip_factory/adapters/youtube/openai_metadata_generator.py`
- Modify: `apps/web/src/modules/settings/application/services/export-diagnostics.service.ts`
- Modify: `.dependency-cruiser.cjs`
- Modify: `scripts/check-ts-boundaries.mjs`
- Modify: `apps/web/eslint.config.mjs`
- Modify: `apps/worker/.importlinter`

## Prerequisites

- Functional fake-provider/integration tests from Tasks 7, 9, 11, 12, and 14 are green.
- Phase 1 diagnostics exporter and runtime sink harness paths are inspected; modify the existing exporter rather than creating a second diagnostics system.

## Security invariants

The test generates random canaries at runtime:

```ts
export type CredentialCanaries = {
  accessToken: string;
  refreshToken: string;
  authorizationCode: string;
  codeVerifier: string;
  clientSecret: string;
};

export function createCredentialCanaries(): CredentialCanaries {
  return {
    accessToken: `cf-at-${crypto.randomUUID()}`,
    refreshToken: `cf-rt-${crypto.randomUUID()}`,
    authorizationCode: `cf-code-${crypto.randomUUID()}`,
    codeVerifier: `cf-verifier-${crypto.randomUUID()}`,
    clientSecret: `cf-client-${crypto.randomUUID()}`,
  };
}
```

No canary value is committed. A failure reports sink name and credential kind, never the canary value.

## RED-GREEN-REFACTOR cycle 1: forbidden runtime sink scan

- [ ] **RED 1.1 — Write integration containment test first.**

Create `credential-containment.test.ts`:

```ts
it('keeps runtime credential canaries out of every forbidden sink', async () => {
  const canaries = createCredentialCanaries();
  const harness = await startYouTubeSecurityHarness({ canaries });
  try {
    await harness.completeFakeOAuthAndPrivateUpload();
    await harness.forceRefresh();
    await harness.exportDiagnostics();
    const findings = await scanRuntimeSinks({
      canaries,
      postgres: harness.postgres,
      redis: harness.redis,
      minio: harness.minio,
      temporal: harness.temporal,
      docker: harness.docker,
      logs: harness.logs,
      diagnosticsArchive: harness.diagnosticsArchive,
    });
    expect(findings).toEqual([]);
  } finally {
    await harness.disconnectAndStop();
  }
});
```

`scanRuntimeSinks` must inspect:

```ts
const forbiddenSinks = [
  'postgres-row-json',
  'redis-key-value-and-stream',
  'minio-structured-object-and-metadata',
  'temporal-payload-and-history',
  'docker-container-env-and-mounts',
  'structured-and-process-logs',
  'diagnostics-archive',
] as const;
```

It searches raw UTF-8, JSON-escaped, URL-encoded, and base64 forms. PostgreSQL enumeration reads every user-table row as JSON text; Redis enumerates string/hash/list/set/stream values and TTL metadata; MinIO reads structured artifact objects/metadata while skipping known binary media bodies but still checking object names/metadata; Temporal inspects raw encoded history payloads and decoded JSON; Docker inspects composed services/actual container env/mount targets; diagnostics archive is extracted in memory. Scan failures return `{ sink, credentialKind, representation }` only.

- [ ] **RED 1.2 — Prove the scanner detects an intentional leak.**

Before running the full harness, unit-test `scanText`:

```ts
it('detects encoded credential forms without returning the secret', () => {
  const canaries = createCredentialCanaries();
  expect(scanText(
    'unit-sink',
    Buffer.from(canaries.refreshToken).toString('base64'),
    canaries,
  )).toEqual([{ sink: 'unit-sink', credentialKind: 'refreshToken', representation: 'base64' }]);
});
```

Run:

```bash
pnpm exec vitest run tests/integration/youtube-publishing/credential-containment.test.ts
```

Expected RED: first the scanner unit passes, then the integration case reports at least one unredacted adapter/log/diagnostic location until production hardening is applied. If it passes immediately, inject a test-only leaked Redis key, prove detection, remove the injection, and continue.

- [ ] **GREEN 1.3 — Eliminate leaks at owning adapters/sinks.**

Use allowlisted structured logging from Task 6; disable HTTPX request/response-body/query logging for Google/OpenAI; redact session query; keep Keychain/backend only in worker composition; ensure Temporal payload/event converters reject credential fields; ensure Compose passes no Google client content/tokens to web; ensure diagnostics copies only safe connection/publication fields.

```python
provider_http = httpx.AsyncClient(
    event_hooks={
        'request': [log_provider_request_without_query_headers_or_body],
        'response': [log_provider_status_only],
    },
    timeout=httpx.Timeout(10.0),
)
```

```ts
const SAFE_PUBLICATION_LOG_FIELDS = [
  'publicationId',
  'attemptId',
  'state',
  'progressPercent',
  'safeReasonCode',
] as const;
logger.info('youtube.publication', pick(event, SAFE_PUBLICATION_LOG_FIELDS));
```

```bash
pnpm exec vitest run tests/integration/youtube-publishing/credential-containment.test.ts
```

Expected GREEN: `findings` is exactly `[]`.

- [ ] **REFACTOR 1.4 — Add browser/Git fixtures to the same evidence model.**

Add a Playwright helper used in Task 16 that scans cookies, localStorage, sessionStorage, IndexedDB names/records, Cache Storage, page HTML, hydration data, and network request/response headers/bodies for canaries. Add a tracked-file scan that examines `git ls-files -z` contents and file names while excluding no test file by value (runtime canaries are not tracked). Both return the same finding shape. Rerun unit tests.

```ts
export type CredentialFinding = {
  sink: string;
  credentialKind: keyof CredentialCanaries;
  representation: 'raw' | 'json' | 'url' | 'base64';
};

export async function scanTrackedFiles(canaries: CredentialCanaries): Promise<CredentialFinding[]> {
  const tracked = await execFileText('git', ['ls-files', '-z']);
  const paths = tracked.split('\0').filter(Boolean);
  return (await Promise.all(paths.map(async (path) => [
    ...scanText(`git-path:${path}`, path, canaries),
    ...scanText(`git-content:${path}`, await readFile(path, 'utf8'), canaries),
  ]))).flat();
}
```

```bash
pnpm exec vitest run tests/integration/youtube-publishing/credential-containment.test.ts
```

## RED-GREEN-REFACTOR cycle 2: sanitized provider errors and diagnostics allowlist

- [ ] **RED 2.1 — Write error/diagnostics tests before modifying exporters.**

`test_youtube_credential_containment.py`:

```python
def test_sanitized_google_error_keeps_only_safe_fields() -> None:
    raw = make_http_error(
        status=403,
        url='https://www.googleapis.com/upload?upload_id=secret-session',
        headers={'Authorization': 'Bearer secret-access'},
        body={
            'error': {
                'code': 403,
                'message': 'request contained secret-access',
                'errors': [{'reason': 'forbidden', 'debug': 'secret-session'}],
            }
        },
    )
    safe = SanitizedGoogleError.from_response(raw)
    assert safe == SanitizedGoogleError(
        http_status=403,
        reason_code='forbidden',
        safe_message='YouTube rejected this operation.',
        retryable=False,
    )
    assert 'secret' not in repr(safe)
```

`youtube-diagnostics.test.ts`:

```ts
it('exports only allowlisted connection/publication fields', async () => {
  const archive = await diagnosticsExporter.export({
    youtubeConnection: makeConnectionEntity(),
    publications: [makePublicationEntity()],
  });
  expect(archive.readJson('youtube-publishing.json')).toEqual({
    connection: {
      id: expect.any(String),
      channelId: 'UC-safe-channel',
      state: 'CONNECTED',
      oauthMode: 'TESTING',
      healthCheckedAt: expect.any(String),
      revocationUncertain: false,
    },
    publications: [expect.objectContaining({
      id: expect.any(String),
      state: 'UPLOAD_OUTCOME_UNCERTAIN',
      youtubeVideoId: null,
      sanitizedErrorCode: null,
    })],
  });
  expect(JSON.stringify(archive.entries())).not.toMatch(
    /token|authorizationCode|codeVerifier|clientSecret|resumableSessionReference|transcript|localPath/i,
  );
});
```

- [ ] **RED 2.2 — Run and witness unsafe copied fields/messages.**

```bash
uv run --directory apps/worker pytest tests/security/test_youtube_credential_containment.py -q
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/security/youtube-diagnostics.test.ts
```

Expected RED: sanitizer/diagnostic shells collect; `safe.reason_code` is the raw provider message (or the diagnostics key snapshot includes a forbidden field) instead of the fixed allowlisted result.

- [ ] **GREEN 2.3 — Implement safe reason maps and diagnostic schema.**

`SanitizedGoogleError.from_response` parses only integer status and first documented reason code through an explicit map; it never persists provider `message`, URL/query, headers, or body. Unknown reason becomes `YOUTUBE_PROVIDER_ERROR`/`YouTube could not complete this operation.` Retryable is true only for network timeout, 429, 500, 502, 503, 504 according to the owning adapter's bounded policy.

Extend the single Phase 1 diagnostics exporter with a versioned `youtube-publishing.json` allowlist. Exclude channel title/handle/avatar if diagnostics does not need them, all metadata text/tags, transcript/project context, local/object keys, session references, token/code/verifier/client config, provider bodies, and paid-call prompt/response. `PAID_CALL_UNCERTAIN` exports only state, reservation/attempt ID, maximum possible micro-USD, and safe reason code. `UPLOAD_OUTCOME_UNCERTAIN` exports only publication/attempt IDs, final-dispatch/uncertainty/reconciliation timestamps/result, acknowledgement boolean, and safe reason code—never session reference, matched candidate metadata, or provider response.

```python
_SAFE_REASONS = {
    'forbidden': ('YOUTUBE_FORBIDDEN', 'YouTube rejected this operation.'),
    'quotaExceeded': ('YOUTUBE_QUOTA_EXCEEDED', 'YouTube quota is exhausted.'),
    'rateLimitExceeded': ('YOUTUBE_RATE_LIMITED', 'YouTube rate-limited this operation.'),
}

@classmethod
def from_response(cls, response: httpx.Response) -> 'SanitizedGoogleError':
    status = int(response.status_code)
    reason = first_documented_reason(response)  # returns a short code or None; never a message
    code, message = _SAFE_REASONS.get(
        reason, ('YOUTUBE_PROVIDER_ERROR', 'YouTube could not complete this operation.'),
    )
    return cls(status, reason or code, message, status in {429, 500, 502, 503, 504})
```

```ts
const youtubeDiagnostics = {
  schemaVersion: 1,
  connection: connection && pick(connection, [
    'id', 'channelId', 'state', 'oauthMode', 'healthCheckedAt', 'revocationUncertain',
  ]),
  publications: publications.map((publication) => pick(publication, [
    'id', 'state', 'youtubeVideoId', 'sanitizedErrorCode',
    'finalChunkDispatchStartedAt', 'outcomeUncertainAt', 'reconciliationCheckedAt',
    'reconciliationResult', 'duplicateRiskAcknowledged',
  ])),
};
```

```bash
uv run --directory apps/worker pytest tests/security/test_youtube_credential_containment.py -q
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/security/youtube-diagnostics.test.ts
```

Expected GREEN: PASS.

- [ ] **REFACTOR 2.4 — Make allowlist drift fail.**

Add an exact snapshot/schema test listing every permitted diagnostics key. A newly added Entity field must not appear automatically. Rerun diagnostics and containment tests.

```ts
expect(Object.keys(document)).toEqual(['schemaVersion', 'connection', 'publications']);
expect(Object.keys(document.connection!)).toEqual([
  'id', 'channelId', 'state', 'oauthMode', 'healthCheckedAt', 'revocationUncertain',
]);
expect(Object.keys(document.publications[0])).toEqual([
  'id', 'state', 'youtubeVideoId', 'sanitizedErrorCode',
  'finalChunkDispatchStartedAt', 'outcomeUncertainAt', 'reconciliationCheckedAt',
  'reconciliationResult', 'duplicateRiskAcknowledged',
]);
```

```bash
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/security/youtube-diagnostics.test.ts
pnpm exec vitest run tests/integration/youtube-publishing/credential-containment.test.ts
```

## RED-GREEN-REFACTOR cycle 3: production/fake port contract parity

- [ ] **RED 3.1 — Write shared contract suites.**

Credential vault contract:

```python
@pytest.mark.parametrize('vault_factory', [fake_vault_factory, keyring_fake_backend_vault_factory])
@pytest.mark.asyncio
async def test_credential_vault_contract(vault_factory) -> None:
    vault = vault_factory()
    assert await vault.contains('connection-1') is False
    await vault.replace_refresh_token('connection-1', SecretStr('runtime-generated'))
    assert await vault.contains('connection-1') is True
    await vault.delete('connection-1')
    await vault.delete('connection-1')
    assert await vault.contains('connection-1') is False
```

Publisher and metadata contracts use these exact subject/scenario matrices:

```python
@pytest.mark.parametrize('publisher_factory', [in_memory_publisher_factory, http_publisher_factory])
@pytest.mark.parametrize(
    'scenario',
    [
        'create_private', 'probe_range', 'complete', 'pre_final_expiry',
        'final_outcome_uncertain', 'reconcile_one', 'reconcile_none',
        'retryable', 'permanent', 'cancel_without_delete', 'thumbnail_warning',
    ],
)
@pytest.mark.asyncio
async def test_youtube_publisher_contract(publisher_factory, scenario) -> None:
    subject, observer = await publisher_factory(scenario)
    result = await exercise_publisher_scenario(subject, scenario)
    assert result == expected_publisher_result(scenario)
    assert observer.deleted_video_ids == []


@pytest.mark.parametrize('generator_factory', [deterministic_generator_factory, openai_generator_factory])
@pytest.mark.parametrize(
    'scenario', ['success', 'refusal', 'schema_error', 'post_transmission_ambiguous'],
)
@pytest.mark.asyncio
async def test_metadata_generator_contract(generator_factory, scenario) -> None:
    subject, observer = await generator_factory(scenario)
    await assert_metadata_scenario(subject, scenario)
    assert observer.automatic_retry_count == 0
```

- [ ] **RED 3.2 — Witness parity differences.**

```bash
uv run --directory apps/worker pytest tests/contracts/test_credential_vault_contract.py tests/contracts/test_youtube_publisher_contract.py tests/contracts/test_metadata_generator_contract.py -q
```

Expected RED: all contract files/subjects collect; the in-memory publisher decreases a probed offset (or retries the ambiguous metadata call) while the production adapter returns the required monotonic/nonretryable result.

- [ ] **GREEN 3.3 — Align contracts without weakening production behavior.**

Make fakes enforce the same validation, local idempotency, monotonic offsets, pre-final replacement, final-dispatch marker, `UPLOAD_OUTCOME_UNCERTAIN`, reconciliation/duplicate-risk gate, retry classification, cancellation/no-delete, redaction, usage completeness, and `PAID_CALL_UNCERTAIN` behavior. Never change a production security rule merely to fit a permissive fake; tighten the fake or the shared port contract.

```python
async def upload_chunk(self, request: UploadChunkRequest) -> UploadProgress:
    state = self._sessions.require(request.session_reference)
    if request.start < state.acknowledged_bytes:
        return UploadProgress(state.acknowledged_bytes, state.video_id, None)
    if request.final_chunk_dispatched and state.drop_final_response:
        state.final_chunk_accepted = True
        raise FinalUploadOutcomeUncertainError('FINAL_UPLOAD_RESULT_UNKNOWN')
    state.append_monotonically(request.start, request.content)
    return state.progress()
```

```bash
uv run --directory apps/worker pytest tests/contracts/test_credential_vault_contract.py tests/contracts/test_youtube_publisher_contract.py tests/contracts/test_metadata_generator_contract.py -q
```

Expected GREEN: PASS for both subjects.

- [ ] **REFACTOR 3.4 — Remove mock-only assertions/helpers.**

Shared suites assert returned state and observable fake-provider requests, not spy call counts on the subject. Production code gains no test-only method. Rerun contract and integration tests.

```python
result = await exercise_publisher_scenario(subject, 'complete')
assert result.completed_video_id == 'video-safe-1'
assert observer.requests[-1].content_range == 'bytes 524288-1048575/1048576'
```

```bash
uv run --directory apps/worker pytest tests/contracts -q
pnpm test:integration
```

## RED-GREEN-REFACTOR cycle 4: executable import/DTO/cycle gates

- [ ] **RED 4.1 — Add negative architecture fixtures.**

`youtube-boundary.test.ts` writes temporary files under the test temp directory and invokes the real scanners:

```ts
it.each([
  ['application imports googleapis', "import type { youtube_v3 } from 'googleapis';"],
  ['UI imports Prisma', "import type { PrismaClient } from '@prisma/client';"],
  ['Entity declares refresh token', 'export type Bad = { refreshToken: string };'],
  ['Record declares authorization code', 'export type BadRecordDto = { authorization_code: string };'],
  ['Temporal DTO declares verifier', 'export type BadWorkflowInput = { codeVerifier: string };'],
])('rejects %s', async (_name, source) => {
  const file = await writeBoundaryFixture(source);
  const result = await runTsBoundaryScanner(file);
  expect(result.exitCode).toBe(1);
  expect(result.stderr).toMatch(/adapter-only|credential field forbidden/);
});
```

Append the Python temporary-fixture matrix:

```python
@pytest.mark.parametrize(
    ('relative_path', 'source'),
    [
        ('domain/leak.py', 'import httpx'),
        ('domain/leak.py', 'import keyring'),
        ('domain/leak.py', 'import openai'),
        ('domain/leak.py', 'import temporalio'),
        ('application/leak.py', 'from clip_factory.adapters.youtube import youtube_publisher'),
        ('entrypoints/temporal/leak.py', 'import httpx'),
        ('entrypoints/contracts/leak.py', 'class Bad(BaseModel):\n    access_token: str'),
    ],
)
def test_python_boundary_fixture_is_rejected(tmp_path, relative_path, source) -> None:
    fixture = write_python_fixture(tmp_path, relative_path, source)
    result = run_import_and_dto_gates(fixture)
    assert result.returncode == 1
```

- [ ] **RED 4.2 — Witness scanner gaps.**

```bash
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/security/youtube-boundary.test.ts
pnpm test:architecture
```

Expected RED: any fixture not rejected exposes a rule gap.

- [ ] **GREEN 4.3 — Close scanner/config gaps.**

Update Task 1's scanner/config patterns to cover every actual Phase 2 directory and boundary-specific DTO suffix. Reject dependency cycles and concrete adapter imports outside composition. Make generated-output/leak tests verify Google/OpenAI Client DTOs remain adapter-local and Task 1 Temporal payloads are token-free.

```js
const forbiddenCredentialField = /\b(?:accessToken|refreshToken|authorizationCode|codeVerifier|clientSecret)\b/u;
const protectedDtoPath = /(?:application\/dto\/entity|entrypoints\/contracts|packages\/contracts\/schema)/u;
if (protectedDtoPath.test(file) && forbiddenCredentialField.test(source)) {
  violations.push(`${file}: credential field forbidden in Entity/Temporal DTO`);
}
```

```ini
[importlinter:contract:youtube-workflow-provider-free]
name = YouTube workflows cannot import provider/network adapters
type = forbidden
source_modules = clip_factory.entrypoints.temporal.youtube_publishing
forbidden_modules = httpx
                    keyring
                    openai
                    clip_factory.adapters.youtube
```

```bash
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/security/youtube-boundary.test.ts
pnpm test:architecture
```

Expected GREEN: every negative fixture is rejected while production tree passes.

- [ ] **REFACTOR 4.4 — Keep one authoritative command.**

Ensure root `pnpm test:architecture` invokes every TS/Python boundary/cycle/DTO test and is the only CI entry point. Focused tests remain developer diagnostics. Rerun root command.

## Broader verification

- [ ] Run:

```bash
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/security
uv run --directory apps/worker pytest tests/security/test_youtube_credential_containment.py tests/contracts/test_credential_vault_contract.py tests/contracts/test_youtube_publisher_contract.py tests/contracts/test_metadata_generator_contract.py -q
pnpm exec vitest run tests/integration/youtube-publishing/credential-containment.test.ts
pnpm test:architecture
pnpm test:contracts
pnpm test:integration
pnpm test:coverage
pnpm typecheck
pnpm format:check
git diff --check
```

- [ ] Run `git grep` command from `master.md`; only adapter/test naming exclusions are permitted and runtime canaries must never be tracked.
- [ ] Confirm `PAID_CALL_UNCERTAIN` exports possible-spend/safe-state only and cannot trigger automatic generation.
- [ ] Confirm `UPLOAD_OUTCOME_UNCERTAIN` exports safe audit state only and cannot trigger automatic replacement before reconciliation plus explicit duplicate-risk acknowledgement.
- [ ] Confirm real Keychain selection fails closed on non-macOS/plaintext/fallback backend.

## Review gate

Approve only when runtime sink/browser/Git scans are clean, intentional leaks are detected, provider errors/diagnostics are allowlisted, production/fake contracts match, and every negative import/DTO/cycle fixture fails CI for the intended reason.

## Suggested commit

```text
test(youtube): enforce credential and boundary containment
```
