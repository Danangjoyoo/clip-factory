# Task 7: Loopback OAuth, Keychain, Google HTTP, Refresh, and Revocation Adapters

> **Implementation mode:** Complete after Tasks 3 and 6. This task supplies native-worker adapters and fake-provider integration only; web routes/UI arrive in Task 8.

## Purpose

Implement the real Desktop OAuth lifecycle in the native worker: load restrictive external client config, bind a random IPv4 loopback port, open the system browser, exchange with PKCE, keep access tokens in memory, persist refresh tokens in macOS Keychain, identify the channel, refresh after restart, handle `invalid_grant`, and revoke/delete safely.

## Requirements and traceability

- YouTube design §§7–10: external Desktop client config, exact scopes, system browser, loopback, one callback, PKCE/state/expiry, Keychain, memory-only access token, channel identity.
- YouTube design §16: authorization/query/body redaction; revoke before local deletion when possible; uncertainty retained.
- Testing §17 and acceptance 1–3, 11: fake authorization/token server cases, restart, testing expiry, disconnect.
- Official behavior: loopback redirect for Desktop apps, `access_type=offline`, token refresh/revocation, `channels.list(mine=true)`.

## Clean Architecture ownership

- **Affected layers:** native adapters and composition only.
- **Implements ports:** Task 6 `YouTubeOAuthGateway`, `CredentialVault`, `OAuthStateStore`, `SystemBrowser`, loopback callback listener, and `ConnectionEventSink`.
- **Client DTO boundary:** raw Google JSON is parsed into adapter-local Pydantic/TypedDict client DTOs, then converted to `SanitizedChannelConnection`.
- **SDK/token confinement:** HTTPX, keyring, Redis, client config, token/client DTOs, query parameters, and access-token cache exist only under `adapters/youtube` or composition.

## Files

- Create: `apps/worker/src/clip_factory/adapters/youtube/__init__.py`
- Create: `apps/worker/src/clip_factory/adapters/youtube/client_dto.py`
- Create: `apps/worker/src/clip_factory/adapters/youtube/client_config.py`
- Create: `apps/worker/src/clip_factory/adapters/youtube/google_oauth_gateway.py`
- Create: `apps/worker/src/clip_factory/adapters/youtube/keychain_credential_vault.py`
- Create: `apps/worker/src/clip_factory/adapters/youtube/loopback_callback_listener.py`
- Create: `apps/worker/src/clip_factory/adapters/youtube/redis_oauth_state_store.py`
- Create: `apps/worker/src/clip_factory/adapters/youtube/system_browser_adapter.py`
- Create: `apps/worker/src/clip_factory/adapters/youtube/connection_event_http_sink.py`
- Create: `apps/worker/src/clip_factory/adapters/youtube/google_error.py`
- Create: `apps/worker/src/clip_factory/converters/youtube_publishing/client_entity/google_oauth.py`
- Create: `apps/worker/tests/adapters/youtube/test_client_config.py`
- Create: `apps/worker/tests/adapters/youtube/test_keychain_credential_vault.py`
- Create: `apps/worker/tests/adapters/youtube/test_loopback_callback_listener.py`
- Create: `apps/worker/tests/adapters/youtube/test_google_oauth_gateway.py`
- Create: `tests/integration/youtube-publishing/test_native_oauth_flow.py`
- Create: `apps/worker/tests/smoke/test_real_keychain_vault.py`
- Modify: `apps/worker/pyproject.toml`
- Modify: `apps/worker/uv.lock`
- Modify: `apps/worker/src/clip_factory/composition/worker_container.py`
- Modify: `.env.example`

## Prerequisites

- Task 3 persists only sanitized connection events.
- Task 6 application tests and port contracts are green.
- `YOUTUBE_OAUTH_CLIENT_CONFIG_PATH` is absent by default; tests inject temporary mode-`0600` fixtures.

## Interfaces and adapter-local types

`client_dto.py` owns provider shapes; it is never imported outside the adapter/converter directories:

```python
from pydantic import BaseModel, ConfigDict, SecretStr


class GoogleTokenClientDto(BaseModel):
    model_config = ConfigDict(extra='forbid')
    access_token: SecretStr
    expires_in: int
    refresh_token: SecretStr | None = None
    refresh_token_expires_in: int | None = None
    scope: str
    token_type: str


class GoogleChannelSnippetClientDto(BaseModel):
    model_config = ConfigDict(extra='ignore')
    title: str
    customUrl: str | None = None
    thumbnails: dict[str, dict[str, str | int]]


class GoogleChannelClientDto(BaseModel):
    model_config = ConfigDict(extra='ignore')
    id: str
    snippet: GoogleChannelSnippetClientDto
```

`MacOSKeychainCredentialVault` implements the public `contains/delete` port and exposes `replace_refresh_token/read_refresh_token` only through an adapter-private `RefreshTokenAccess` protocol. The composition root passes that private protocol to `GoogleOAuthGateway`; application/domain code cannot import it.

## RED-GREEN-REFACTOR cycle 1: restrictive client config and Keychain contract

- [ ] **RED 1.1 — Write config and vault tests first.**

`test_client_config.py`:

```python
from pathlib import Path

import pytest

from clip_factory.adapters.youtube.client_config import load_desktop_client_config


def test_loads_mode_0600_desktop_config(tmp_path: Path) -> None:
    path = tmp_path / 'google-client.json'
    path.write_text(
        '{"installed":{"client_id":"desktop-id","client_secret":"sentinel-client-config",'
        '"auth_uri":"https://accounts.google.com/o/oauth2/v2/auth",'
        '"token_uri":"https://oauth2.googleapis.com/token"}}',
        encoding='utf-8',
    )
    path.chmod(0o600)
    config = load_desktop_client_config(path)
    assert config.client_id == 'desktop-id'


def test_rejects_group_readable_or_web_client_config(tmp_path: Path) -> None:
    path = tmp_path / 'google-client.json'
    path.write_text('{"web":{"client_id":"wrong"}}', encoding='utf-8')
    path.chmod(0o644)
    with pytest.raises(ValueError, match='must be a Desktop client file with mode 0600'):
        load_desktop_client_config(path)
```

`test_keychain_credential_vault.py` uses an in-memory keyring backend and a sentinel `SecretStr`:

```python
import pytest
from pydantic import SecretStr

from clip_factory.adapters.youtube.keychain_credential_vault import MacOSKeychainCredentialVault


@pytest.mark.asyncio
async def test_keychain_round_trip_is_scoped_by_opaque_connection_id(fake_keyring) -> None:
    first = MacOSKeychainCredentialVault(fake_keyring)
    await first.replace_refresh_token('connection-1', SecretStr('sentinel-refresh'))
    restarted = MacOSKeychainCredentialVault(fake_keyring)
    assert (await restarted.read_refresh_token('connection-1')).get_secret_value() == 'sentinel-refresh'
    assert await restarted.contains('connection-1') is True
    await restarted.delete('connection-1')
    assert await restarted.contains('connection-1') is False
```

- [ ] **RED 1.2 — Witness both missing adapters.**

```bash
uv run --directory apps/worker pytest tests/adapters/youtube/test_client_config.py tests/adapters/youtube/test_keychain_credential_vault.py -q
```

Expected RED: adapter signature shells collect; after `replace_refresh_token`, a freshly constructed vault reports `contains(connectionId) === false` instead of reading the fake Keychain backend.

- [ ] **GREEN 1.3 — Implement config and Keychain access.**

Add `httpx==0.28.1` and `keyring==25.7.0` to `[project].dependencies` in `apps/worker/pyproject.toml`; add `pytest-httpserver==1.1.5` to `[dependency-groups].dev`. Run `uv lock --directory apps/worker` and commit the resulting `apps/worker/uv.lock` change.

`load_desktop_client_config` resolves a regular file, rejects any permission bit in `0o077`, parses only the `installed` object, and returns a frozen adapter DTO with `client_secret: SecretStr`. It never logs path contents.

Implement the vault with service name `com.clip-factory.youtube.refresh-token` and opaque connection ID as username:

```python
import asyncio

from pydantic import SecretStr
from keyring.errors import PasswordDeleteError


SERVICE_NAME = 'com.clip-factory.youtube.refresh-token'


class MacOSKeychainCredentialVault:
    def __init__(self, backend) -> None:
        self._backend = backend

    async def replace_refresh_token(self, connection_id: str, token: SecretStr) -> None:
        await asyncio.to_thread(
            self._backend.set_password,
            SERVICE_NAME,
            connection_id,
            token.get_secret_value(),
        )

    async def read_refresh_token(self, connection_id: str) -> SecretStr:
        value = await asyncio.to_thread(
            self._backend.get_password,
            SERVICE_NAME,
            connection_id,
        )
        if value is None:
            raise KeyError(f'no credential for connection {connection_id}')
        return SecretStr(value)

    async def contains(self, connection_id: str) -> bool:
        value = await asyncio.to_thread(
            self._backend.get_password,
            SERVICE_NAME,
            connection_id,
        )
        return value is not None

    async def delete(self, connection_id: str) -> None:
        try:
            await asyncio.to_thread(
                self._backend.delete_password,
                SERVICE_NAME,
                connection_id,
            )
        except PasswordDeleteError:
            remaining = await asyncio.to_thread(
                self._backend.get_password,
                SERVICE_NAME,
                connection_id,
            )
            if remaining is not None:
                raise
```

The composition root selects and verifies the backend before constructing the vault:

```python
import keyring


def require_macos_keychain_backend():
    backend = keyring.get_keyring()
    if backend.__class__.__module__ != 'keyring.backends.macOS':
        raise RuntimeError(
            f'macOS Keychain backend required; refusing {backend.__class__.__module__}'
        )
    return backend
```

Do not fall back to plaintext, file, fail, or third-party backends. A unit test injects a fake backend directly into the adapter; production composition must call `require_macos_keychain_backend()` and fail closed.

Run the focused tests. Expected GREEN: PASS.

- [ ] **REFACTOR 1.4 — Prevent accidental secret representation.**

Keep every secret as `SecretStr`, add `repr`/log-capture tests proving sentinel values do not appear, and verify client config/vault modules are rejected if imported by worker application/domain. Rerun focused tests and import-linter.

```python
def test_secret_values_are_absent_from_repr_and_logs(caplog) -> None:
    vault = make_vault_with_fake_backend()
    token = SecretStr('sentinel-refresh-token')
    assert 'sentinel-refresh-token' not in repr(token)
    assert 'sentinel-refresh-token' not in repr(vault)
    assert 'sentinel-refresh-token' not in caplog.text


@pytest.mark.asyncio
async def test_delete_reraises_when_backend_retains_the_credential() -> None:
    vault = MacOSKeychainCredentialVault(RetainingDeleteFailureBackend())
    with pytest.raises(PasswordDeleteError):
        await vault.delete('connection-1')
```

```bash
uv run --directory apps/worker pytest tests/adapters/youtube/test_keychain_credential_vault.py -q
uv run --directory apps/worker lint-imports
```

## RED-GREEN-REFACTOR cycle 2: one-shot IPv4 loopback and system browser

- [ ] **RED 2.1 — Write real-loopback listener tests.**

`test_loopback_callback_listener.py` must bind an OS-assigned port and use HTTPX against it:

```python
import asyncio

import httpx
import pytest

from clip_factory.adapters.youtube.loopback_callback_listener import LoopbackCallbackListener


@pytest.mark.asyncio
async def test_accepts_one_exact_callback_then_closes() -> None:
    listener = LoopbackCallbackListener(timeout_seconds=1)
    callback_uri = await listener.start()
    assert callback_uri.startswith('http://127.0.0.1:')
    callback_task = asyncio.create_task(listener.wait_for_callback())
    response = await httpx.AsyncClient().get(
        f'{callback_uri}?code=code-1&state=state-1',
        headers={'Host': callback_uri.removeprefix('http://').split('/')[0]},
    )
    assert response.status_code == 200
    assert 'return to Clip Factory' in response.text
    assert (await callback_task).code == 'code-1'
    with pytest.raises(httpx.ConnectError):
        await httpx.AsyncClient().get(callback_uri)


@pytest.mark.asyncio
async def test_rejects_wrong_path_denial_and_timeout_without_query_logging(caplog) -> None:
    listener = LoopbackCallbackListener(timeout_seconds=0.01)
    callback_uri = await listener.start()
    wrong = callback_uri.replace('/oauth2/callback', '/wrong')
    assert (await httpx.AsyncClient().get(wrong)).status_code == 404
    with pytest.raises(TimeoutError, match='OAuth callback timed out'):
        await listener.wait_for_callback()
    assert 'code=' not in caplog.text
    assert 'state=' not in caplog.text
```

Also test an OAuth denial callback returns a typed `OAuthConsentDeniedError`, an unexpected Host header returns 400, and a second simultaneous callback is rejected.

- [ ] **RED 2.2 — Witness missing listener.**

```bash
uv run --directory apps/worker pytest tests/adapters/youtube/test_loopback_callback_listener.py -q
```

Expected RED: the listener signature shell collects and binds; the exact one-shot callback times out instead of returning `{ code: 'code-1', state: 'state-1' }`.

- [ ] **GREEN 2.3 — Implement listener and browser adapter.**

Use `await asyncio.start_server(self._handle_client, host='127.0.0.1', port=0, family=socket.AF_INET)`. Read the assigned port from `server.sockets[0].getsockname()[1]` and expose only `http://127.0.0.1:<assigned>/oauth2/callback`. Parse one bounded request line (maximum 8192 bytes), validate method `GET`, exact `Host`, and exact path before parsing query values. Send a static UTF-8 success/denial page, close the listening socket after the first valid OAuth result or timeout, and never log the request target/query.

`SystemBrowserAdapter.open(url)` calls `webbrowser.open_new_tab(url)` through `asyncio.to_thread` and raises a typed error when it returns false; no embedded webview or copy/paste mode exists.

```python
async def start(self) -> str:
    self._server = await asyncio.start_server(
        self._handle_client,
        host='127.0.0.1',
        port=0,
        family=socket.AF_INET,
        limit=8192,
    )
    port = self._server.sockets[0].getsockname()[1]
    self._callback_uri = f'http://127.0.0.1:{port}/oauth2/callback'
    return self._callback_uri


class SystemBrowserAdapter:
    async def open(self, url: str) -> None:
        opened = await asyncio.to_thread(webbrowser.open_new_tab, url)
        if not opened:
            raise SystemBrowserOpenError('system browser rejected the authorization URL')
```

```bash
uv run --directory apps/worker pytest tests/adapters/youtube/test_loopback_callback_listener.py -q
```

Expected GREEN: PASS.

- [ ] **REFACTOR 2.4 — Bound every resource.**

Enforce one connection at a time, one result, 8192-byte request line, ten-minute production timeout, and deterministic socket close in `finally`. Execute the focused test ten times with the exact command below; every iteration must pass:

```bash
for run in 1 2 3 4 5 6 7 8 9 10; do
  uv run --directory apps/worker pytest tests/adapters/youtube/test_loopback_callback_listener.py -q || exit 1
done
```

## RED-GREEN-REFACTOR cycle 3: Google token/channel adapter, refresh, and revocation

- [ ] **RED 3.1 — Write fake-server adapter contract tests.**

`test_google_oauth_gateway.py` uses `pytest-httpserver` and a fake Keychain adapter. Cover:

```python
@pytest.mark.asyncio
async def test_exchange_stores_refresh_token_keeps_access_token_in_memory_and_returns_channel(
    httpserver,
    fake_keychain,
) -> None:
    httpserver.expect_request('/token', method='POST').respond_with_json({
        'access_token': 'sentinel-access',
        'refresh_token': 'sentinel-refresh',
        'expires_in': 3600,
        'refresh_token_expires_in': 604800,
        'scope': 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly',
        'token_type': 'Bearer',
    })
    httpserver.expect_request('/youtube/v3/channels', method='GET').respond_with_json({
        'items': [{
            'id': 'UC-safe-channel',
            'snippet': {
                'title': 'Clip Factory Test',
                'customUrl': '@clipfactorytest',
                'thumbnails': {'default': {'url': 'https://yt3.ggpht.com/safe'}},
            },
        }],
    })
    gateway = make_google_oauth_gateway(httpserver, fake_keychain)
    connection = await gateway.exchange_store_and_identify(
        'connection-1',
        'http://127.0.0.1:43123/oauth2/callback',
        'code-1',
        'verifier-1',
    )
    assert fake_keychain.values == {'connection-1': 'sentinel-refresh'}
    assert connection.channel_id == 'UC-safe-channel'
    assert 'sentinel-access' not in repr(connection)


@pytest.mark.asyncio
async def test_refresh_after_gateway_restart_and_invalid_grant_mapping(httpserver, fake_keychain) -> None:
    fake_keychain.values['connection-1'] = 'sentinel-refresh'
    httpserver.expect_oneshot_request('/token', method='POST').respond_with_json({
        'access_token': 'sentinel-access-2',
        'expires_in': 3600,
        'scope': 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly',
        'token_type': 'Bearer',
    })
    gateway = make_google_oauth_gateway(httpserver, fake_keychain)
    await gateway.refresh_and_check('connection-1')
    httpserver.expect_oneshot_request('/token', method='POST').respond_with_json(
        {'error': 'invalid_grant'},
        status=400,
    )
    restarted = make_google_oauth_gateway(httpserver, fake_keychain)
    with pytest.raises(ReauthRequiredError):
        await restarted.refresh_and_check('connection-1')
```

The same file contains this exact case matrix; each case asserts the listed typed result and that `sentinel-access`, `sentinel-refresh`, `code-1`, and `verifier-1` are absent from `caplog.text`:

```python
@pytest.mark.parametrize(
    ('scenario', 'expected'),
    [
        ('missing_scope', MissingOAuthScopeError),
        ('consent_denied', OAuthConsentDeniedError),
        ('empty_channel', ConnectedChannelNotFoundError),
        ('workspace_policy_denied', GoogleWorkspacePolicyError),
        ('revoke_network_failure', False),
        ('revoke_200', True),
    ],
)
@pytest.mark.asyncio
async def test_gateway_contract_cases(scenario, expected, httpserver, fake_keychain, caplog) -> None:
    gateway = configure_gateway_scenario(httpserver, fake_keychain, scenario)
    if isinstance(expected, type) and issubclass(expected, Exception):
        with pytest.raises(expected):
            await exercise_gateway_scenario(gateway, scenario)
    else:
        assert await exercise_gateway_scenario(gateway, scenario) is expected
    assert not {'sentinel-access', 'sentinel-refresh', 'code-1', 'verifier-1'} & set(caplog.text.split())
```

Inspect fake-server request bodies to prove PKCE verifier goes only to `/token` and authorization uses exactly the two required scopes.

- [ ] **RED 3.2 — Witness missing gateway.**

```bash
uv run --directory apps/worker pytest tests/adapters/youtube/test_google_oauth_gateway.py -q
```

Expected RED: gateway/client signature shells collect; successful exchange leaves `fake_keychain.values` empty instead of storing `sentinel-refresh` under `connection-1`.

- [ ] **GREEN 3.3 — Implement direct HTTP adapter and explicit client conversion.**

Authorization URL parameters are exactly `client_id`, loopback `redirect_uri`, `response_type=code`, the two space-separated scopes, `access_type=offline`, `prompt=consent`, one-time `state`, `code_challenge`, and `code_challenge_method=S256`.

Token exchange/refresh use form POST to the configured token endpoint. Store a new refresh token in Keychain before reporting success; retain access tokens only in a private in-memory dictionary keyed by connection ID with monotonic expiry. Send bearer tokens only in `Authorization` headers. Identify the channel with `GET /youtube/v3/channels?part=snippet&mine=true`. Convert client DTOs through `converters/youtube_publishing/client_entity/google_oauth.py` and validate exact scopes before returning `SanitizedChannelConnection`.

Map `invalid_grant` to `ReauthRequiredError`; map policy denials and other provider errors to typed sanitized errors containing HTTP status, Google reason code, and a fixed safe message, never a response body. Revoke using `POST /revoke` with the refresh token; return `False` on network/4xx so the application records uncertainty and still deletes locally.

```python
async def refresh_and_check(self, connection_id: str) -> SanitizedChannelConnection:
    refresh_token = await self._vault.read_refresh_token(connection_id)
    response = await self._request(
        'POST',
        self._config.token_endpoint,
        data={
            'client_id': self._config.client_id,
            'client_secret': self._config.client_secret.get_secret_value(),
            'grant_type': 'refresh_token',
            'refresh_token': refresh_token.get_secret_value(),
        },
    )
    if response.status_code == 400 and response.json().get('error') == 'invalid_grant':
        raise ReauthRequiredError('Google authorization must be renewed')
    token = parse_token_response(response)
    self._access_tokens[connection_id] = InMemoryAccessToken.from_response(token)
    return await self._identify_channel(connection_id)
```

```bash
uv run --directory apps/worker pytest tests/adapters/youtube/test_google_oauth_gateway.py -q
```

Expected GREEN: PASS.

- [ ] **REFACTOR 3.4 — Centralize safe HTTP execution inside the adapter.**

Use one private request function that applies bounded timeouts, parses only expected client DTOs, and emits `redact_google_event` output. Do not create a provider-agnostic HTTP base class. Rerun adapter tests, mypy, Ruff, and import-linter.

```python
async def _request(self, method: str, url: str, **kwargs: object) -> httpx.Response:
    try:
        response = await self._http.request(method, url, timeout=httpx.Timeout(10.0), **kwargs)
    except httpx.TimeoutException as error:
        raise GoogleNetworkError('Google request timed out') from error
    self._logger.info('google_http', extra=redact_google_event({
        'method': method,
        'url': url,
        'status': response.status_code,
    }))
    return response
```

```bash
uv run --directory apps/worker pytest tests/adapters/youtube/test_google_oauth_gateway.py -q
uv run --directory apps/worker mypy src tests
uv run --directory apps/worker ruff check .
uv run --directory apps/worker lint-imports
```

## RED-GREEN-REFACTOR cycle 4: complete native flow integration and persistence callback

- [ ] **RED 4.1 — Write the fake-Google full integration test.**

Create `tests/integration/youtube-publishing/test_native_oauth_flow.py` to run the real application service, real loopback listener, Redis state adapter against disposable Redis, fake Keychain, fake Google server, and authenticated fake internal Next.js endpoint. It must assert:

- only a SHA-256 state digest exists in Redis with TTL at most 600 seconds;
- the browser fake receives the provider URL;
- one callback completes and consumes Redis state;
- the internal event body contains only connection UUID/channel/scopes/status/expiry/testing warning;
- denial/mismatch/timeout/missing-scope produce sanitized events and no Keychain item;
- refresh after creating a new gateway instance succeeds from Keychain;
- `invalid_grant` emits `REAUTH_REQUIRED` without deleting drafts/renders;
- disconnect calls revoke then deletes locally, or records `revocationUncertain=true` after network failure.

The integration file drives those cases through this table, so every listed outcome has an executable assertion rather than a prose fixture:

```python
@pytest.mark.parametrize(
    ('scenario', 'event_type', 'credential_present'),
    [
        ('success', 'CONNECTED', True),
        ('denial', 'OAUTH_CONSENT_DENIED', False),
        ('state_mismatch', 'OAUTH_STATE_MISMATCH', False),
        ('timeout', 'OAUTH_CALLBACK_TIMEOUT', False),
        ('missing_scope', 'OAUTH_SCOPE_MISSING', False),
        ('invalid_grant', 'REAUTH_REQUIRED', True),
    ],
)
@pytest.mark.asyncio
async def test_native_oauth_flow_cases(harness, scenario, event_type, credential_present) -> None:
    await harness.run_scenario(scenario)
    assert harness.internal_events[-1]['type'] == event_type
    assert await harness.keychain.contains(harness.connection_id) is credential_present
    assert harness.redis.raw_state_count == 0
    assert harness.redis.maximum_observed_ttl_seconds <= 600
```

Run the new file before composition exists:

```bash
uv run --directory apps/worker pytest ../../tests/integration/youtube-publishing/test_native_oauth_flow.py -q
```

Expected RED: the first scenario reaches the test harness but observes no authenticated internal event because composition is not registered.

- [ ] **RED 4.2 — Run and witness composition/integration gaps.**

```bash
uv run --directory apps/worker pytest ../../tests/integration/youtube-publishing/test_native_oauth_flow.py -q
```

Expected RED: composition shells start; the success scenario observes no authenticated `CONNECTED` event instead of the exact sanitized internal event.

- [ ] **GREEN 4.3 — Wire production adapters only in composition.**

`composition/worker_container.py` reads native-worker-only endpoint overrides/client-config path, constructs HTTPX with redacted logging, keyring's macOS backend, Redis state store, loopback listener factory, system browser, and authenticated `ConnectionEventHttpSink`. No token-bearing object is registered with Temporal or the internal HTTP sink.

```python
def build_youtube_oauth_service(settings: WorkerSettings) -> YouTubeOAuthService:
    keychain = MacOSKeychainCredentialVault(require_macos_keychain_backend())
    http = httpx.AsyncClient(transport=build_redacted_transport(settings))
    return YouTubeOAuthService(
        gateway=GoogleOAuthGateway(http, keychain, load_google_client_config(settings)),
        vault=keychain,
        state_store=RedisOAuthStateStore(redis_from_settings(settings)),
        active_flows=InMemoryActiveOAuthFlowStore(),
        listener_factory=lambda: LoopbackCallbackListener(timeout_seconds=600),
        browser=SystemBrowserAdapter(),
        events=ConnectionEventHttpSink(http, settings.internal_worker_credential),
        clock=SystemClock(),
    )
```

```bash
uv run --directory apps/worker pytest ../../tests/integration/youtube-publishing/test_native_oauth_flow.py -q
```

Expected GREEN: PASS for all fake-provider cases.

- [ ] **REFACTOR 4.4 — Prove real Keychain behavior as explicit local smoke.**

Create `test_real_keychain_vault.py` marked `real_keychain`; it stores a generated inert sentinel under a test-only connection ID, constructs a new vault, reads it, and deletes it in `finally`. It requires `CLIP_FACTORY_KEYCHAIN_TEST=1`, skips otherwise, and never prints the value.

Run on the target Mac only:

```bash
CLIP_FACTORY_KEYCHAIN_TEST=1 uv run --directory apps/worker pytest tests/smoke/test_real_keychain_vault.py -q -m real_keychain
```

Expected GREEN: PASS and no test item remains in Keychain.

## Broader verification

- [ ] Run:

```bash
uv run --directory apps/worker pytest tests/adapters/youtube -q
uv run --directory apps/worker pytest ../../tests/integration/youtube-publishing/test_native_oauth_flow.py -q
uv run --directory apps/worker ruff check src tests
uv run --directory apps/worker mypy src
uv run --directory apps/worker lint-imports
pnpm test:architecture
pnpm test:integration
git diff --check
```

- [ ] Capture logs from every test and assert no sentinel access token, refresh token, code, verifier, client-secret value, or raw callback query appears.
- [ ] Inspect the worker environment/Compose config and confirm client-config path and Google endpoints are never exposed to `apps/web` or the browser.

## Review gate

Approve only when the fake-provider matrix passes, a process restart refreshes from Keychain, only one exact loopback callback is accepted, missing scope/`invalid_grant` are typed, revoke uncertainty is preserved, and log/Redis/HTTP/Temporal sinks contain no credentials.

## Suggested commit

```text
feat(worker): add secure native YouTube OAuth adapters
```
