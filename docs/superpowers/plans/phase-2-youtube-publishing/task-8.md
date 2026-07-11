# Task 8: Connection Orchestration, APIs, UI, Reconnect, and Disconnect

> **Implementation mode:** Complete after Tasks 3, 6, and 7. This task connects the native credential lifecycle to thin Next.js delivery without allowing token material into web contracts.

## Purpose

Let the user connect, inspect, reconnect, and disconnect one channel from the local web app. Next.js schedules token-free native workflows and persists only sanitized worker events; the UI shows worker-offline, Testing-mode expiry, `REAUTH_REQUIRED`, and revocation-uncertainty states.

## Requirements and traceability

- YouTube design §§5, 8–10: Connect action, internal worker request, one channel, health/testing warning, reconnect, native-worker-offline behavior.
- YouTube design §§16–18: explicit confirmation, sanitized errors, revoke/delete, nonsecret history, connect/disconnect Playwright behavior.
- Clean Architecture §19: thin routes/UI, application ports, Temporal client confined to adapter, API/Entity/Temporal/UI DTO separation.

## Clean Architecture ownership

- **Affected layers:** application services/ports, Temporal adapter/workflow entrypoint, HTTP delivery/converters, React UI/view model, composition.
- **Owned ports:** `YouTubeConnectionWorkflowScheduler`, `WorkerAvailability`, `OAuthCompletionReceiptStore`, `YouTubeConnectionDataServiceContract` consumption.
- **DTO boundaries:** public/internal API DTOs convert to/from Entity DTOs; Temporal inputs come from Task 1; UI view model is separate.
- **Forbidden:** routes/components import Prisma, Temporal, Google, keyring, worker adapters, or Entity DTOs directly.

## Files

- Create: `apps/web/src/modules/youtube-publishing/application/ports/youtube-connection-workflow-scheduler.ts`
- Create: `apps/web/src/modules/youtube-publishing/application/services/manage-youtube-connection.service.ts`
- Create: `apps/web/src/modules/youtube-publishing/application/services/manage-youtube-connection.service.test.ts`
- Create: `apps/web/src/modules/youtube-publishing/adapters/clients/temporal-youtube-connection-workflow-scheduler.ts`
- Create: `apps/web/src/modules/youtube-publishing/delivery/http/dto/api/youtube-connection-api.dto.ts`
- Create: `apps/web/src/modules/youtube-publishing/converters/api-entity/youtube-connection.converter.ts`
- Create: `apps/web/src/modules/youtube-publishing/converters/api-entity/youtube-connection.converter.test.ts`
- Create: `apps/web/src/modules/youtube-publishing/delivery/http/youtube-connection.controller.ts`
- Create: `apps/web/src/app/api/v1/youtube/connections/route.ts`
- Create: `apps/web/src/app/api/v1/youtube/connections/disconnect/route.ts`
- Create: `apps/web/src/app/api/internal/v1/youtube/connections/events/route.ts`
- Create: `apps/web/src/modules/youtube-publishing/delivery/http/youtube-connection.controller.test.ts`
- Create: `apps/web/src/modules/youtube-publishing/delivery/ui/youtube-connection.vm.ts`
- Create: `apps/web/src/modules/youtube-publishing/delivery/ui/youtube-connection-panel.tsx`
- Create: `apps/web/src/modules/youtube-publishing/delivery/ui/youtube-connection-panel.module.css`
- Create: `apps/web/src/modules/youtube-publishing/delivery/ui/youtube-connection-panel.test.tsx`
- Create: `apps/worker/src/clip_factory/entrypoints/temporal/youtube_publishing/oauth_workflow.py`
- Create: `apps/worker/src/clip_factory/entrypoints/temporal/youtube_publishing/oauth_activities.py`
- Create: `apps/worker/src/clip_factory/ports/youtube_publishing/oauth_completion_receipt_store.py`
- Create: `apps/worker/src/clip_factory/adapters/youtube/redis_oauth_completion_receipt_store.py`
- Modify: `apps/worker/src/clip_factory/adapters/youtube/connection_event_http_sink.py`
- Create: `apps/worker/tests/entrypoints/temporal/youtube_publishing/test_oauth_workflow.py`
- Create: `apps/worker/tests/entrypoints/temporal/youtube_publishing/oauth_workflow_harness.py`
- Create: `apps/worker/tests/adapters/youtube/test_redis_oauth_completion_receipt_store.py`
- Create: `apps/worker/tests/adapters/youtube/test_connection_event_http_sink.py`
- Create: `tests/integration/youtube-publishing/youtube-connection-lifecycle.test.ts`
- Modify: `apps/web/src/modules/youtube-publishing/composition/youtube-publishing.module.ts`
- Modify: `apps/worker/src/clip_factory/composition/worker_container.py`

## Prerequisites

- Task 3 connection data service is green.
- Task 7 native flow and fake-Google integration are green.
- Phase 1 internal worker route authentication and worker-health projection are reused unchanged.

## Interfaces

```ts
import type { WorkflowId } from '@/shared/domain';

import type { YouTubeConnectionId } from '../dto/entity/youtube-publishing-entity.dto';

export interface YouTubeConnectionWorkflowScheduler {
  startConnect(input: {
    connectionId: YouTubeConnectionId;
  }): Promise<WorkflowId>;
  startDisconnect(input: {
    connectionId: YouTubeConnectionId;
  }): Promise<WorkflowId>;
}
```

Worker application port; its value is sanitized Task 6 Entity data, never a generated/HTTP/Redis DTO:

```python
from datetime import timedelta
from typing import Protocol

from clip_factory.ports.youtube_publishing.oauth import (
    SanitizedChannelConnection,
)


class OAuthCompletionReceiptStore(Protocol):
    async def get_connected(
        self,
        connection_id: str,
    ) -> SanitizedChannelConnection | None:
        raise NotImplementedError

    async def put_connected(
        self,
        connection: SanitizedChannelConnection,
        ttl: timedelta,
    ) -> None:
        raise NotImplementedError
```

Public response shape:

```ts
export type YouTubeConnectionApiDto = {
  id: string;
  channel: {
    id: string;
    title: string;
    handle: string | null;
    avatarUrl: string | null;
  } | null;
  grantedScopes: readonly string[];
  status: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'REAUTH_REQUIRED';
  oauthMode: 'TESTING' | 'PRODUCTION' | 'UNKNOWN';
  refreshTokenExpiresAt: string | null;
  testingExpiryWarning: string | null;
  revocationUncertain: boolean;
  workerAvailable: boolean;
};
```

No public/internal DTO has an index signature; `additionalProperties` are rejected by the Phase 1 request validator.

## RED-GREEN-REFACTOR cycle 1: application policy and token-free internal events

- [ ] **RED 1.1 — Write service tests first.**

Create `manage-youtube-connection.service.test.ts`:

```ts
import { beforeEach, expect, it, vi } from 'vitest';

import { ManageYouTubeConnectionService } from './manage-youtube-connection.service';

const connectionId = '018f4f2c-93d7-7c75-8f0f-7f5165e8bb42' as const;

beforeEach(() => vi.useFakeTimers({ now: new Date('2026-07-11T00:00:00.000Z') }));

it('starts a token-free connect workflow only when the worker is available', async () => {
  const scheduler = { startConnect: vi.fn().mockResolvedValue('workflow-1'), startDisconnect: vi.fn() };
  const service = new ManageYouTubeConnectionService(
    makeConnectionDataServiceFake(),
    scheduler,
    { isAvailable: vi.fn().mockResolvedValue(true) },
    { randomId: () => connectionId },
  );
  await expect(service.connect()).resolves.toEqual({ connectionId, workflowId: 'workflow-1' });
  expect(scheduler.startConnect).toHaveBeenCalledWith({ connectionId });
});

it('rejects connect while the worker is offline', async () => {
  const service = new ManageYouTubeConnectionService(
    makeConnectionDataServiceFake(),
    makeConnectionSchedulerFake(),
    { isAvailable: vi.fn().mockResolvedValue(false) },
    { randomId: () => connectionId },
  );
  await expect(service.connect()).rejects.toMatchObject({ code: 'YOUTUBE_WORKER_OFFLINE' });
});

it('reuses the same opaque UUID when reconnecting', async () => {
  const existing = makeConnectionEntity({ id: connectionId, state: 'REAUTH_REQUIRED' });
  const dataService = makeConnectionDataServiceFake({ connected: existing });
  const scheduler = makeConnectionSchedulerFake();
  const service = makeConnectionService({
    dataService,
    scheduler,
    idGenerator: { randomId: vi.fn(() => 'new-id-must-not-be-used') },
  });
  await expect(service.connect()).resolves.toMatchObject({ connectionId });
  expect(scheduler.startConnect).toHaveBeenCalledWith({ connectionId });
});

it('persists sanitized invalid_grant without losing the channel record', async () => {
  const dataService = makeConnectionDataServiceFake({ connected: makeConnectionEntity() });
  const service = makeConnectionService({ dataService });
  await service.acceptWorkerEvent({
    connectionId,
    type: 'REAUTH_REQUIRED',
    reasonCode: 'INVALID_GRANT',
  });
  expect(dataService.markReauthRequired).toHaveBeenCalledWith(connectionId);
  expect(dataService.disconnect).not.toHaveBeenCalled();
});

it('retains history and revocation uncertainty on disconnect completion', async () => {
  const dataService = makeConnectionDataServiceFake({ connected: makeConnectionEntity() });
  const service = makeConnectionService({ dataService });
  await service.acceptWorkerEvent({
    connectionId,
    type: 'DISCONNECTED',
    revocationUncertain: true,
  });
  expect(dataService.disconnect).toHaveBeenCalledWith(connectionId, true);
});
```

- [ ] **RED 1.2 — Witness the missing application service.**

```bash
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/application/services/manage-youtube-connection.service.test.ts
```

Expected RED: service/port signature shells collect; duplicate `connect` calls schedule two workflows instead of returning the existing `youtube-oauth:<connectionId>` workflow.

- [ ] **GREEN 1.3 — Implement four use cases behind one cohesive service.**

Implement `get`, `connect`, `disconnect`, and `acceptWorkerEvent`. `connect` checks worker availability, reuses the primary row's opaque `YouTubeConnectionId` for reconnect/disconnected history, and generates a new ID only when no row exists. It schedules Task 1's exact two-scope payload; a duplicate running workflow ID is idempotent. `disconnect` requires an existing non-disconnected connection and schedules only its UUID. `acceptWorkerEvent` exhaustively handles:

```ts
async connect(): Promise<YouTubeConnectionStartEntityDto> {
  if (!await this.workerAvailability.isAvailable()) throw new YouTubeWorkerOfflineError();
  const existing = await this.connections.getPrimary();
  const connectionId = existing?.id ?? this.ids.randomId();
  const workflowId = await this.scheduler.startConnect({ connectionId });
  return { connectionId, workflowId };
}
```

```ts
export type YouTubeConnectionWorkerEventEntity =
  | { type: 'CONNECTED'; connection: ConnectedChannelInput }
  | { type: 'REAUTH_REQUIRED'; connectionId: YouTubeConnectionId; reasonCode: 'INVALID_GRANT' }
  | {
      type: 'DISCONNECTED';
      connectionId: YouTubeConnectionId;
      revocationUncertain: boolean;
    }
  | {
      type: 'FAILED';
      connectionId: YouTubeConnectionId;
      reasonCode:
        | 'CONSENT_DENIED'
        | 'STATE_MISMATCH'
        | 'STATE_EXPIRED'
        | 'MISSING_SCOPE'
        | 'CALLBACK_TIMEOUT'
        | 'GOOGLE_POLICY_DENIED';
    };
```

Unknown event types fail validation before the service. The service never accepts a provider error body or credential field.

Run the focused test. Expected GREEN: PASS.

- [ ] **REFACTOR 1.4 — Make Testing-mode warning deterministic.**

Add this failing test to the same file:

```ts
it('shows the exact seven-day Testing-mode reconnect warning', async () => {
  const service = makeConnectionService({
    dataService: makeConnectionDataServiceFake({
      connected: makeConnectionEntity({
        oauthMode: 'TESTING',
        refreshTokenExpiresAt: new Date('2026-07-18T00:00:00.000Z'),
      }),
    }),
  });
  await expect(service.get()).resolves.toMatchObject({
    testingExpiryWarning:
      'Google OAuth Testing refresh tokens may expire in seven days. Reconnect before 18 Jul 2026, 00:00 UTC.',
  });
});
```

Witness RED, inject the existing Phase 1 clock/UTC formatter, implement the exact message, rerun, and keep date formatting out of the controller/UI.

## RED-GREEN-REFACTOR cycle 2: deterministic worker workflow and Temporal adapter

- [ ] **RED 2.1 — Write time-skipping workflow tests before workflow code.**

Create `test_oauth_workflow.py`:

```python
from datetime import timedelta

import pytest
from temporalio.testing import WorkflowEnvironment
from temporalio.worker import Worker

from clip_factory.entrypoints.contracts.generated.youtube_publishing import (
    OAuthConnectionWorkflowInputV1,
)
from clip_factory.entrypoints.temporal.youtube_publishing.oauth_workflow import (
    YouTubeOAuthWorkflow,
)
from tests.entrypoints.temporal.youtube_publishing.oauth_workflow_harness import (
    CapturingAuthorizationActivity,
    CapturingDeliveryActivity,
    OAuthWorkflowHarness,
    make_connected_result,
    make_oauth_workflow_input,
)


@pytest.mark.asyncio
async def test_oauth_workflow_separates_authorization_from_result_delivery() -> None:
    async with await WorkflowEnvironment.start_time_skipping() as env:
        authorization = CapturingAuthorizationActivity(make_connected_result())
        delivery = CapturingDeliveryActivity()
        async with Worker(
            env.client,
            task_queue='test-youtube-oauth',
            workflows=[YouTubeOAuthWorkflow],
            activities=[authorization.run, delivery.run],
        ):
            result = await env.client.execute_workflow(
                YouTubeOAuthWorkflow.run,
                OAuthConnectionWorkflowInputV1(
                    contractVersion=1,
                    connectionId='018f4f2c-93d7-7c75-8f0f-7f5165e8bb42',
                    requestedScopes=(
                        'https://www.googleapis.com/auth/youtube.upload',
                        'https://www.googleapis.com/auth/youtube.readonly',
                    ),
                ),
                id='youtube-oauth-connection-1',
                task_queue='test-youtube-oauth',
                execution_timeout=timedelta(minutes=12),
            )
            assert result.status == 'CONNECTED'
            assert authorization.inputs[0].model_dump().keys() == {
                'contractVersion', 'connectionId', 'requestedScopes'
            }
            assert delivery.results == [result]
```

Append these workflow tests:

```python
@pytest.mark.asyncio
async def test_transient_delivery_failure_never_reopens_browser_consent() -> None:
    async with await OAuthWorkflowHarness.start(delivery_failures=1) as harness:
        result = await harness.run(make_oauth_workflow_input())
        assert result.status == 'CONNECTED'
        assert harness.browser_open_count == 1
        assert harness.authorization_attempt_count == 1
        assert harness.delivery_attempt_count == 2


@pytest.mark.asyncio
async def test_lost_authorization_ack_resumes_receipt_or_keychain_without_browser() -> None:
    async with await OAuthWorkflowHarness.start(
        lose_authorization_ack_after_credential_store=True,
    ) as harness:
        result = await harness.run(make_oauth_workflow_input())
        assert result.status == 'CONNECTED'
        assert harness.authorization_attempt_count == 2
        assert harness.browser_open_count == 1
        assert harness.keychain_write_count == 1
        assert harness.delivery_attempt_count == 1


@pytest.mark.asyncio
async def test_consent_denial_is_terminal_and_not_retried() -> None:
    async with await OAuthWorkflowHarness.start(consent_denied=True) as harness:
        result = await harness.run(make_oauth_workflow_input())
        assert result.status == 'DISCONNECTED'
        assert result.safe_reason_code == 'CONSENT_DENIED'
        assert harness.authorization_attempt_count == 1
        assert harness.browser_open_count == 1
```

Create `oauth_workflow_harness.py` with an async-context-manager `OAuthWorkflowHarness.start(...)`, a real time-skipping `WorkflowEnvironment`, one `Worker`, in-memory receipt/Keychain fakes, and counters exposed above. `__aexit__` always shuts down the worker/environment. Its authorization fake writes the fake Keychain and sanitized receipt before simulating the lost acknowledgement, so the second activity attempt can prove it does not call the browser. Run the workflow file and witness the named browser-count assertion fail against the one-activity implementation.

- [ ] **RED 2.2 — Witness missing workflow.**

```bash
uv run --directory apps/worker pytest tests/entrypoints/temporal/youtube_publishing/test_oauth_workflow.py -q
```

Expected RED: workflow/activity signature shells collect; the first test observes no separate `authorize_or_resume_oauth_activity` then `deliver_oauth_result_activity` sequence. Missing modules/imports are not accepted RED.

- [ ] **GREEN 2.3 — Implement deterministic wrapper and web scheduler adapter.**

Worker workflow:

```python
from datetime import timedelta

from temporalio import workflow

with workflow.unsafe.imports_passed_through():
    from clip_factory.entrypoints.contracts.generated.youtube_publishing import (
        OAuthConnectionWorkflowInputV1,
        OAuthConnectionWorkflowResultV1,
    )
    from .oauth_activities import (
        authorize_or_resume_oauth_activity,
        deliver_oauth_result_activity,
    )


@workflow.defn
class YouTubeOAuthWorkflow:
    @workflow.run
    async def run(
        self,
        payload: OAuthConnectionWorkflowInputV1,
    ) -> OAuthConnectionWorkflowResultV1:
        authorization = await workflow.execute_activity(
            authorize_or_resume_oauth_activity,
            payload,
            start_to_close_timeout=timedelta(minutes=11),
            heartbeat_timeout=timedelta(seconds=15),
            retry_policy=authorization_retry_policy(),
        )
        await workflow.execute_activity(
            deliver_oauth_result_activity,
            authorization,
            start_to_close_timeout=timedelta(seconds=30),
            retry_policy=idempotent_delivery_retry_policy(),
        )
        return authorization
```

`authorize_or_resume_oauth_activity` is retry-safe in this exact order: read the sanitized Redis completion receipt by connection ID; if present, return it; otherwise, if Keychain already contains the connection credential, call `refresh_and_check`, write the sanitized receipt, and return without opening a browser; only when neither exists call the Task 6 service. For that call, composition injects `RedisOAuthCompletionReceiptStore` as the Task 6 `ConnectionEventSink`, so successful credential storage is followed by a sanitized receipt with a 24-hour TTL rather than HTTP delivery. The receipt contains channel metadata/scopes/mode/expiry only—never state, verifier, code, access/refresh token, or client config. A crash after Keychain write but before receipt write is therefore recovered by `refresh_and_check`; a crash after receipt write returns the receipt. Consent denial is nonretryable.

`deliver_oauth_result_activity` alone invokes `ConnectionEventHttpSink`. The sink posts a closed generated event with worker authentication and `Idempotency-Key: oauth-result:<connectionId>:<status>`; exact repeats return the same `204`. Its retries cannot call the browser, token endpoint, or Keychain writer. `test_redis_oauth_completion_receipt_store.py` round-trips every safe field, verifies TTL, and rejects/does not serialize credential-like keys. `test_connection_event_http_sink.py` proves two identical deliveries use identical bytes/idempotency key and that no response body or credential is logged.

The TypeScript scheduler adapter imports `@temporalio/client` only under `adapters/clients`, uses workflow ID `youtube-oauth:<connectionId>`, rejects an already-running duplicate as an idempotent existing workflow, and passes only generated `OAuthConnectionWorkflowInputV1`.

Run worker workflow test and TypeScript scheduler unit test with a complete fake Temporal client. Expected GREEN: PASS.

- [ ] **REFACTOR 2.4 — Verify deterministic replay.**

Replay a captured workflow history with Temporal's replayer test utility and assert workflow code imports no clock/random/keyring/httpx modules. Rerun `pnpm test:architecture` and worker import-linter.

```python
@pytest.mark.asyncio
async def test_oauth_workflow_replays_recorded_history() -> None:
    replayer = Replayer(workflows=[YouTubeOAuthWorkflow])
    await replayer.replay_workflow(
        WorkflowHistory.from_json(load_fixture('youtube_oauth_success_history.json'))
    )
```

```bash
uv run --directory apps/worker pytest tests/entrypoints/temporal/youtube_publishing/test_oauth_workflow.py -q
uv run --directory apps/worker pytest tests/adapters/youtube/test_redis_oauth_completion_receipt_store.py tests/adapters/youtube/test_connection_event_http_sink.py -q
pnpm test:architecture
uv run --directory apps/worker lint-imports
```

## RED-GREEN-REFACTOR cycle 3: thin public/internal HTTP delivery

- [ ] **RED 3.1 — Write route-level HTTP tests first.**

Create `youtube-connection.controller.test.ts` using the Phase 1 test server:

```ts
it('POST /api/v1/youtube/connections returns 202 without credentials', async () => {
  connectionService.connect.mockResolvedValue({
    connectionId: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb42',
    workflowId: 'workflow-1',
  });
  const response = await testApi.post('/api/v1/youtube/connections').send({});
  expect(response.status).toBe(202);
  expect(response.body).toEqual({
    connectionId: '018f4f2c-93d7-7c75-8f0f-7f5165e8bb42',
    workflowId: 'workflow-1',
  });
  expect(JSON.stringify(response.body)).not.toMatch(/token|codeVerifier|clientSecret/i);
});

it('internal connection event requires worker authentication and rejects extra fields', async () => {
  await testApi.post('/api/internal/v1/youtube/connections/events')
    .send({ type: 'REAUTH_REQUIRED', connectionId: connectionId, reasonCode: 'INVALID_GRANT' })
    .expect(401);
  await testApi.post('/api/internal/v1/youtube/connections/events')
    .set('Authorization', `Bearer ${internalWorkerCredential}`)
    .send({
      type: 'REAUTH_REQUIRED',
      connectionId,
      reasonCode: 'INVALID_GRANT',
      refreshToken: 'sentinel',
    })
    .expect(400);
});
```

- [ ] **RED 3.2 — Witness missing routes.**

```bash
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/delivery/http/youtube-connection.controller.test.ts
```

Expected RED: the registered route/controller shell returns `501 NOT_IMPLEMENTED` instead of the asserted `202` token-free start response. A route `404` is not accepted.

- [ ] **GREEN 3.3 — Implement validators, converters, controller, and routes.**

API DTOs are closed Zod/Phase 1 validator schemas. `YouTubeConnectionController` calls one service method per route, maps typed errors to `400/409/503`, maps Entity output through `youtubeConnectionEntityToApi`, and returns no Entity instance. Internal route reuses Phase 1 service authentication before parsing/dispatch.

```ts
export class YouTubeConnectionController {
  constructor(private readonly service: ManageYouTubeConnectionService) {}

  async connect(request: AuthenticatedRequest): Promise<ApiResponse> {
    connectYouTubeRequestSchema.parse(request.body);
    const result = await this.service.connect();
    return { status: 202, body: youtubeConnectionStartEntityToApi(result) };
  }

  async acceptInternalEvent(request: WorkerAuthenticatedRequest): Promise<ApiResponse> {
    const event = parseYouTubeConnectionEventV1(request.body);
    await this.service.acceptWorkerEvent(connectionEventContractToEntity(event));
    return { status: 204, body: null };
  }
}
```

```bash
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/delivery/http/youtube-connection.controller.test.ts
```

Expected GREEN: PASS.

- [ ] **REFACTOR 3.4 — Prove delivery thinness.**

Architecture checks must reject repository/Temporal/provider imports in controller/route files. Keep response-copy/testing warning in converter/application output, not route conditionals. Rerun HTTP tests and architecture suite.

```js
{
  name: 'youtube-delivery-cannot-import-infrastructure',
  from: { path: '^apps/web/src/modules/youtube-publishing/delivery/' },
  to: { path: '/(adapters/persistence|@temporalio|googleapis)/' },
}
```

```bash
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/delivery/http/youtube-connection.controller.test.ts
pnpm test:architecture
```

## RED-GREEN-REFACTOR cycle 4: accessible connection UI

- [ ] **RED 4.1 — Write component state/interaction tests.**

Create `youtube-connection-panel.test.tsx`:

```tsx
it('disables connect while worker is offline with an actionable explanation', () => {
  render(
    <YouTubeConnectionPanel
      connection={makeConnectionVm({ status: 'DISCONNECTED', workerAvailable: false })}
      onConnect={vi.fn()}
      onDisconnect={vi.fn()}
    />,
  );
  expect(screen.getByRole('button', { name: 'Connect YouTube' })).toBeDisabled();
  expect(screen.getByText('Start the native worker to connect or upload.')).toBeVisible();
});

it('shows reconnect and Testing expiry without losing channel identity', async () => {
  const onConnect = vi.fn();
  render(
    <YouTubeConnectionPanel
      connection={makeConnectionVm({
        status: 'REAUTH_REQUIRED',
        channelTitle: 'Clip Factory Test',
        testingExpiryWarning: 'Google OAuth Testing refresh tokens may expire in seven days.',
      })}
      onConnect={onConnect}
      onDisconnect={vi.fn()}
    />,
  );
  expect(screen.getByText('Clip Factory Test')).toBeVisible();
  expect(screen.getByText(/may expire in seven days/)).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Reconnect YouTube' }));
  expect(onConnect).toHaveBeenCalledOnce();
});

it('requires disconnect confirmation and explains revocation uncertainty', async () => {
  const onDisconnect = vi.fn();
  render(
    <YouTubeConnectionPanel
      connection={makeConnectionVm({ status: 'CONNECTED', revocationUncertain: true })}
      onConnect={vi.fn()}
      onDisconnect={onDisconnect}
    />,
  );
  await user.click(screen.getByRole('button', { name: 'Disconnect YouTube' }));
  expect(screen.getByRole('dialog', { name: 'Disconnect YouTube?' })).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Revoke access and disconnect' }));
  expect(onDisconnect).toHaveBeenCalledOnce();
  expect(screen.getByText(/remote revocation could not be confirmed/)).toBeVisible();
});
```

- [ ] **RED 4.2 — Witness missing component.**

```bash
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/delivery/ui/youtube-connection-panel.test.tsx
```

Expected RED: the component/view-model shells render; `getByRole('button', { name: 'Connect YouTube' })` fails because the semantic connect button is not yet emitted.

- [ ] **GREEN 4.3 — Implement semantic, controlled UI.**

`YouTubeConnectionVm` contains presentation-ready strings/booleans only. The component uses native buttons, a labeled status, `aria-live=polite` for connecting/errors, a keyboard-operable modal following the Phase 1 dialog pattern, and controlled async callbacks. It stores no channel or OAuth data in browser storage.

```tsx
export function YouTubeConnectionPanel({ connection, onConnect, onDisconnect }: Props) {
  const connectLabel = connection.status === 'REAUTH_REQUIRED'
    ? 'Reconnect YouTube'
    : 'Connect YouTube';
  return (
    <section aria-labelledby="youtube-connection-heading">
      <h2 id="youtube-connection-heading">YouTube connection</h2>
      <p role="status" aria-live="polite">{connection.statusLabel}</p>
      {connection.testingExpiryWarning && <p>{connection.testingExpiryWarning}</p>}
      <button disabled={!connection.workerAvailable} onClick={() => void onConnect()}>
        {connectLabel}
      </button>
      {connection.status === 'CONNECTED' && (
        <button onClick={() => setConfirmingDisconnect(true)}>Disconnect YouTube</button>
      )}
      <DisconnectDialog
        open={confirmingDisconnect}
        onCancel={() => setConfirmingDisconnect(false)}
        onConfirm={onDisconnect}
      />
    </section>
  );
}
```

```css
.panel {
  display: grid;
  min-inline-size: 0;
  gap: var(--space-4);
  padding: var(--space-6);
  border-radius: var(--radius-panel);
  background: var(--color-surface);
}
.actions { display: flex; flex-wrap: wrap; gap: var(--space-3); }
.warning { color: var(--color-warning); overflow-wrap: anywhere; }
@media (max-width: 47.99rem) {
  .panel { padding: var(--space-4); }
  .actions > button { inline-size: 100%; }
}
@media (prefers-reduced-motion: reduce) {
  .panel * { scroll-behavior: auto; transition-duration: 0.01ms; }
}
```

```bash
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/delivery/ui/youtube-connection-panel.test.tsx
```

Expected GREEN: PASS.

- [ ] **REFACTOR 4.4 — Verify every UI state.**

Append this table-driven test:

```tsx
it.each([
  ['DISCONNECTED', 'YouTube disconnected'],
  ['CONNECTING', 'Connecting to YouTube'],
  ['CONNECTED', 'YouTube connected'],
  ['REAUTH_REQUIRED', 'Reconnect required'],
] as const)('renders status text for %s', (status, label) => {
  render(
    <YouTubeConnectionPanel
      connection={makeConnectionVm({ status })}
      onConnect={vi.fn()}
      onDisconnect={vi.fn()}
    />,
  );
  expect(screen.getByRole('status')).toHaveTextContent(label);
});
```

Witness RED for any unhandled state, implement an exhaustive `Record<ConnectionVmStatus, string>`, and rerun component tests; expected GREEN is PASS.

## Broader verification

- [ ] Run:

```bash
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/application/services/manage-youtube-connection.service.test.ts src/modules/youtube-publishing/converters/api-entity/youtube-connection.converter.test.ts src/modules/youtube-publishing/delivery/http/youtube-connection.controller.test.ts src/modules/youtube-publishing/delivery/ui/youtube-connection-panel.test.tsx
uv run --directory apps/worker pytest tests/entrypoints/temporal/youtube_publishing/test_oauth_workflow.py tests/adapters/youtube/test_redis_oauth_completion_receipt_store.py tests/adapters/youtube/test_connection_event_http_sink.py -q
pnpm test:integration
pnpm test:architecture
pnpm typecheck
pnpm format:check
git diff --check
```

- [ ] Confirm response bodies, server-rendered HTML, hydration data, and browser storage contain no credential-like names/values.

```bash
pnpm --filter @clip-factory/web exec vitest run src/modules/youtube-publishing/delivery/http/youtube-connection.controller.test.ts src/modules/youtube-publishing/delivery/ui/youtube-connection-panel.test.tsx -t 'credential|token-free'
```

- [ ] Confirm disconnect retains drafts/renders/publication history and never deletes a remote video or accepted YouTube schedule.

```bash
pnpm exec vitest run tests/integration/youtube-publishing/youtube-connection-lifecycle.test.ts -t 'disconnect retains history and remote video'
```

## Review gate

Approve only when connection flows operate through UUID-only Temporal payloads, internal events are authenticated/closed/sanitized, Testing/reauth/offline states are accessible, disconnect is confirmed, and web code has no token/provider/Temporal leakage.

## Suggested commit

```text
feat(youtube): connect channel through native OAuth workflow
```
