# Task 6: Native OAuth Security Policy and Application-Owned Ports

> **Implementation mode:** Complete after Task 1. This task is pure Python domain/application code plus fakes; concrete browser, HTTP, Redis, and Keychain adapters belong to Task 7.

## Purpose

Define PKCE/state/scope/redaction invariants and narrow worker-owned ports so the native OAuth lifecycle can be tested without Google, Keychain, Redis, Temporal, a browser, or a network listener.

## Requirements and traceability

- YouTube design §§7–10: exact two scopes, Desktop app, system browser, random loopback, PKCE S256, 43–128 verifier, one-time state, ten-minute expiry, refresh/reconnect behavior.
- YouTube design §§16–19: no token leakage, narrow `YouTubeOAuthGateway`/`CredentialVault`, sanitized errors, pure application tests.
- Acceptance criteria 1–3, 11–12: credential containment, restart refresh, `REAUTH_REQUIRED`, revocation/deletion, adapter isolation.

## Clean Architecture ownership

- **Affected layers:** worker domain, application service, application-owned ports, test fakes.
- **Owned ports:** `YouTubeOAuthGateway`, `CredentialVault`, `OAuthStateStore`, `SystemBrowser`, `ConnectionEventSink`, `Clock`, and `EntropySource` with only methods needed by OAuth use cases.
- **Boundary rule:** ports exchange connection IDs, state digests, authorization results, and sanitized connection metadata. No port method returns a raw token to application code.
- **Forbidden imports:** `httpx`, `keyring`, `redis`, `temporalio`, `openai`, Google SDKs, Pydantic transport models.

## Files

- Create: `apps/worker/src/clip_factory/domain/youtube_publishing/__init__.py`
- Create: `apps/worker/src/clip_factory/domain/youtube_publishing/oauth_policy.py`
- Create: `apps/worker/src/clip_factory/domain/youtube_publishing/redaction.py`
- Create: `apps/worker/src/clip_factory/application/youtube_publishing/__init__.py`
- Create: `apps/worker/src/clip_factory/application/youtube_publishing/oauth_service.py`
- Create: `apps/worker/src/clip_factory/ports/youtube_publishing/__init__.py`
- Create: `apps/worker/src/clip_factory/ports/youtube_publishing/oauth.py`
- Create: `apps/worker/src/clip_factory/ports/youtube_publishing/credential_vault.py`
- Create: `apps/worker/src/clip_factory/ports/youtube_publishing/oauth_state_store.py`
- Create: `apps/worker/src/clip_factory/ports/youtube_publishing/system_browser.py`
- Create: `apps/worker/src/clip_factory/ports/youtube_publishing/connection_event_sink.py`
- Create: `apps/worker/src/clip_factory/ports/youtube_publishing/runtime.py`
- Create: `apps/worker/tests/domain/youtube_publishing/test_oauth_policy.py`
- Create: `apps/worker/tests/domain/youtube_publishing/test_redaction.py`
- Create: `apps/worker/tests/application/youtube_publishing/test_oauth_service.py`
- Create: `apps/worker/tests/fakes/youtube_publishing.py`

## Prerequisites

- Task 1 token-free OAuth workflow input is generated in Python.
- Phase 1 Python package/import-linter/test conventions are green.

## Interfaces

Define immutable application types and protocols in the named port files:

```python
from dataclasses import dataclass
from datetime import datetime
from typing import Protocol


@dataclass(frozen=True, slots=True)
class AuthorizationRequest:
    authorization_display_url: str
    state_digest: str
    expires_at: datetime


@dataclass(frozen=True, slots=True)
class SanitizedChannelConnection:
    connection_id: str
    channel_id: str
    channel_title: str
    channel_handle: str | None
    avatar_url: str | None
    granted_scopes: tuple[str, ...]
    oauth_mode: str
    refresh_token_expires_at: datetime | None


class YouTubeOAuthGateway(Protocol):
    async def create_authorization_request(
        self,
        connection_id: str,
        redirect_uri: str,
        state: str,
        code_challenge: str,
    ) -> str:
        raise NotImplementedError

    async def exchange_store_and_identify(
        self,
        connection_id: str,
        redirect_uri: str,
        authorization_code: str,
        code_verifier: str,
    ) -> SanitizedChannelConnection:
        raise NotImplementedError

    async def refresh_and_check(
        self,
        connection_id: str,
    ) -> SanitizedChannelConnection:
        raise NotImplementedError

    async def revoke(self, connection_id: str) -> bool:
        raise NotImplementedError


class CredentialVault(Protocol):
    async def contains(self, connection_id: str) -> bool:
        raise NotImplementedError

    async def delete(self, connection_id: str) -> None:
        raise NotImplementedError


class OAuthStateStore(Protocol):
    async def put(self, state_digest: str, connection_id: str, expires_at: datetime) -> None:
        raise NotImplementedError

    async def consume(self, state_digest: str, now: datetime) -> str | None:
        raise NotImplementedError
```

The concrete OAuth gateway may compose a concrete Keychain adapter internally, but these application protocols never accept or return access/refresh tokens, codes, verifiers, or client secrets except the short-lived code/verifier arguments required for the direct native exchange. Those arguments remain inside the worker process and are never serialized.

## RED-GREEN-REFACTOR cycle 1: PKCE, state, scope, and callback invariants

- [ ] **RED 1.1 — Write pure policy tests first.**

Create `test_oauth_policy.py`:

```python
from datetime import UTC, datetime, timedelta
import re

import pytest

from clip_factory.domain.youtube_publishing.oauth_policy import (
    REQUIRED_YOUTUBE_SCOPES,
    OAuthSecurityError,
    create_pkce,
    create_state,
    hash_state,
    validate_callback,
    validate_scopes,
)


def test_pkce_uses_s256_and_valid_verifier_characters() -> None:
    verifier, challenge = create_pkce(lambda size: bytes(range(size)))
    assert 43 <= len(verifier) <= 128
    assert re.fullmatch(r'[A-Za-z0-9._~-]+', verifier)
    assert challenge == 'wsNdZaf3VpLTsEDmR5gPk2C6xYVWxKb0xcaG3O6kX10'
    assert '=' not in challenge


def test_state_is_high_entropy_and_only_digest_is_persisted() -> None:
    state = create_state(lambda size: b'a' * size)
    assert len(state) >= 43
    assert hash_state(state) == hash_state(state)
    assert state not in hash_state(state)


def test_callback_requires_exact_host_path_state_and_unexpired_flow() -> None:
    now = datetime(2026, 7, 11, tzinfo=UTC)
    expires_at = now + timedelta(minutes=10)
    assert validate_callback(
        host='127.0.0.1',
        path='/oauth2/callback',
        supplied_state='state-1',
        expected_state='state-1',
        now=now,
        expires_at=expires_at,
    ) is None
    for field, value in (
        ('host', 'localhost'),
        ('path', '/wrong'),
        ('supplied_state', 'state-2'),
    ):
        arguments = {
            'host': '127.0.0.1',
            'path': '/oauth2/callback',
            'supplied_state': 'state-1',
            'expected_state': 'state-1',
            'now': now,
            'expires_at': expires_at,
        }
        arguments[field] = value
        with pytest.raises(OAuthSecurityError):
            validate_callback(**arguments)
    with pytest.raises(OAuthSecurityError, match='authorization flow expired'):
        validate_callback(
            host='127.0.0.1',
            path='/oauth2/callback',
            supplied_state='state-1',
            expected_state='state-1',
            now=expires_at,
            expires_at=expires_at,
        )


def test_scope_validation_requires_exact_capabilities_and_no_extra_scope() -> None:
    assert validate_scopes(REQUIRED_YOUTUBE_SCOPES) == REQUIRED_YOUTUBE_SCOPES
    with pytest.raises(OAuthSecurityError, match='missing required scopes'):
        validate_scopes((REQUIRED_YOUTUBE_SCOPES[0],))
    with pytest.raises(OAuthSecurityError, match='unexpected OAuth scopes'):
        validate_scopes((*REQUIRED_YOUTUBE_SCOPES, 'https://www.googleapis.com/auth/youtube.force-ssl'))
    with pytest.raises(OAuthSecurityError, match='unexpected OAuth scopes'):
        validate_scopes((*REQUIRED_YOUTUBE_SCOPES, 'openid'))
```

- [ ] **RED 1.2 — Witness missing policy.**

```bash
uv run --directory apps/worker pytest tests/domain/youtube_publishing/test_oauth_policy.py -q
```

Expected RED: the policy signature shell collects; `validate_scopes((*REQUIRED_YOUTUBE_SCOPES, 'openid'))` is accepted instead of raising `unexpected OAuth scopes`.

- [ ] **GREEN 1.3 — Implement exact pure functions.**

Create `oauth_policy.py`:

```python
from collections.abc import Callable, Iterable
from datetime import datetime
import base64
import hashlib
import hmac


REQUIRED_YOUTUBE_SCOPES = (
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube.readonly',
)


class OAuthSecurityError(ValueError):
    pass


def _base64url(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b'=').decode('ascii')


def create_pkce(random_bytes: Callable[[int], bytes]) -> tuple[str, str]:
    verifier = _base64url(random_bytes(64))
    if not 43 <= len(verifier) <= 128:
        raise OAuthSecurityError('PKCE verifier length is invalid')
    challenge = _base64url(hashlib.sha256(verifier.encode('ascii')).digest())
    return verifier, challenge


def create_state(random_bytes: Callable[[int], bytes]) -> str:
    return _base64url(random_bytes(32))


def hash_state(state: str) -> str:
    return hashlib.sha256(state.encode('ascii')).hexdigest()


def validate_scopes(granted: Iterable[str]) -> tuple[str, ...]:
    granted_set = set(granted)
    required_set = set(REQUIRED_YOUTUBE_SCOPES)
    missing = required_set - granted_set
    if missing:
        raise OAuthSecurityError(f'missing required scopes: {sorted(missing)}')
    unexpected = granted_set - required_set
    if unexpected:
        raise OAuthSecurityError(f'unexpected OAuth scopes: {sorted(unexpected)}')
    return REQUIRED_YOUTUBE_SCOPES


def validate_callback(
    *,
    host: str,
    path: str,
    supplied_state: str,
    expected_state: str,
    now: datetime,
    expires_at: datetime,
) -> None:
    if host != '127.0.0.1' or path != '/oauth2/callback':
        raise OAuthSecurityError('unexpected OAuth callback target')
    if now >= expires_at:
        raise OAuthSecurityError('authorization flow expired')
    if not hmac.compare_digest(supplied_state, expected_state):
        raise OAuthSecurityError('OAuth state mismatch')
```

Run the focused test. Expected GREEN: PASS.

- [ ] **REFACTOR 1.4 — Keep provider-independent entropy injection.**

The production composition root will inject `secrets.token_bytes`; tests inject deterministic bytes. Do not introduce global random state. Rerun the focused test and `uv run --directory apps/worker lint-imports`.

```python
from collections.abc import Callable


def create_oauth_proof(
    entropy: Callable[[int], bytes],
) -> OAuthProof:
    state = base64.urlsafe_b64encode(entropy(32)).rstrip(b'=').decode('ascii')
    verifier = base64.urlsafe_b64encode(entropy(64)).rstrip(b'=').decode('ascii')
    return OAuthProof(state=state, verifier=verifier, challenge=pkce_challenge(verifier))
```

```bash
uv run --directory apps/worker pytest tests/domain/youtube_publishing/test_oauth_policy.py -q
uv run --directory apps/worker lint-imports
```

## RED-GREEN-REFACTOR cycle 2: structural redaction

- [ ] **RED 2.1 — Write recursive redaction tests.**

Create `test_redaction.py`:

```python
from clip_factory.domain.youtube_publishing.redaction import redact_google_event


def test_redacts_headers_queries_bodies_and_nested_credentials() -> None:
    event = {
        'headers': {'Authorization': 'Bearer sentinel', 'Content-Type': 'application/json'},
        'url': 'https://oauth2.googleapis.com/token?code=sentinel&state=sentinel',
        'body': {'refresh_token': 'sentinel', 'nested': {'accessToken': 'sentinel'}},
        'status': 400,
    }
    assert redact_google_event(event) == {
        'headers': {'Authorization': '[REDACTED]', 'Content-Type': 'application/json'},
        'url': 'https://oauth2.googleapis.com/token',
        'body': '[REDACTED]',
        'status': 400,
    }


def test_drops_cookie_set_cookie_and_unknown_headers() -> None:
    redacted = redact_google_event({
        'headers': {
            'Cookie': 'oauth=sentinel',
            'Set-Cookie': 'refresh=sentinel',
            'X-Debug-Credential': 'sentinel',
            'Retry-After': '30',
        },
    })
    assert redacted == {'headers': {'Retry-After': '30'}}
```

- [ ] **RED 2.2 — Witness missing redactor.**

```bash
uv run --directory apps/worker pytest tests/domain/youtube_publishing/test_redaction.py -q
```

Expected RED: the redactor signature shell collects; it returns the raw/nested event instead of the exact allowlisted redacted object in RED 2.1.

- [ ] **GREEN 2.3 — Implement allowlist-first redaction.**

Create `redaction.py`:

```python
from collections.abc import Mapping
from typing import Any
from urllib.parse import urlsplit, urlunsplit


def redact_google_event(event: Mapping[str, Any]) -> dict[str, Any]:
    output: dict[str, Any] = {}
    if 'headers' in event and isinstance(event['headers'], Mapping):
        safe_headers = {'content-type', 'retry-after', 'x-request-id'}
        output['headers'] = {
            str(key): '[REDACTED]' if str(key).lower() == 'authorization' else value
            for key, value in event['headers'].items()
            if str(key).lower() == 'authorization' or str(key).lower() in safe_headers
        }
    if 'url' in event and isinstance(event['url'], str):
        parsed = urlsplit(event['url'])
        output['url'] = urlunsplit((parsed.scheme, parsed.netloc, parsed.path, '', ''))
    if 'body' in event:
        output['body'] = '[REDACTED]'
    for key in ('method', 'status', 'request_id', 'error_code'):
        if key in event:
            output[key] = event[key]
    return output
```

Run the focused test. Expected GREEN: PASS.

- [ ] **REFACTOR 2.4 — Reject unknown event fields from diagnostics.**

Append this test before refactoring:

```python
def test_unknown_nested_oauth_payload_is_dropped() -> None:
    assert redact_google_event(
        {'status': 400, 'oauth_payload': {'credential': 'runtime-secret'}}
    ) == {'status': 400}
```

Run the redaction file. If the unknown field is copied, expected RED shows it in the result; then retain the explicit output allowlist shown above and rerun. Expected GREEN is the exact `{'status': 400}` result.

## RED-GREEN-REFACTOR cycle 3: use-case orchestration with token-free ports

- [ ] **RED 3.1 — Write application tests with behavior-preserving fakes.**

Create `test_oauth_service.py`:

```python
from datetime import UTC, datetime, timedelta

import pytest

from clip_factory.application.youtube_publishing.oauth_service import YouTubeOAuthService
from tests.fakes.youtube_publishing import make_oauth_fakes


@pytest.mark.asyncio
async def test_begin_stores_only_digest_then_opens_system_browser() -> None:
    fakes = make_oauth_fakes(now=datetime(2026, 7, 11, tzinfo=UTC))
    service = YouTubeOAuthService(**fakes.dependencies)
    result = await service.begin('018f4f2c-93d7-7c75-8f0f-7f5165e8bb42')
    assert fakes.state_store.entries == {
        result.state_digest: (
            '018f4f2c-93d7-7c75-8f0f-7f5165e8bb42',
            datetime(2026, 7, 11, 0, 10, tzinfo=UTC),
        )
    }
    assert len(fakes.browser.opened) == 1
    assert 'state=' in fakes.browser.opened[0]
    assert result.authorization_display_url == 'https://accounts.google.com/o/oauth2/v2/auth'
    assert '?' not in result.authorization_display_url
    assert fakes.state_store.raw_states == []


@pytest.mark.asyncio
async def test_disconnect_deletes_keychain_even_when_remote_revoke_fails() -> None:
    fakes = make_oauth_fakes(now=datetime(2026, 7, 11, tzinfo=UTC), revoke_result=False)
    service = YouTubeOAuthService(**fakes.dependencies)
    result = await service.disconnect('018f4f2c-93d7-7c75-8f0f-7f5165e8bb42')
    assert fakes.vault.deleted == ['018f4f2c-93d7-7c75-8f0f-7f5165e8bb42']
    assert result.revocation_uncertain is True
```

The fake bundle implements complete port protocols and real one-time state behavior; tests assert outcomes, not that a mock exists.

- [ ] **RED 3.2 — Witness missing service/ports.**

```bash
uv run --directory apps/worker pytest tests/application/youtube_publishing/test_oauth_service.py -q
```

Expected RED: the service/port signature shells collect; `begin` leaves the browser fake empty instead of opening exactly one authorization URL.

- [ ] **GREEN 3.3 — Implement minimal orchestration.**

`YouTubeOAuthService.begin` must:

1. ask a loopback-listener port for a random bound `127.0.0.1` callback URI,
2. create state/verifier/challenge with the entropy port,
3. retain raw state/verifier only in an in-memory `ActiveOAuthFlow` owned by the service for ten minutes,
4. put only `hash_state(state)` plus connection ID/expiry through `OAuthStateStore`,
5. ask `YouTubeOAuthGateway` for the URL and `SystemBrowser` to open it,
6. open the full one-time provider URL only through `SystemBrowser`, then return `AuthorizationRequest` containing `authorization_display_url` with its query removed, state digest, and expiry. The full URL is never returned through a Temporal result, HTTP event, or UI DTO.

`complete` consumes the state digest exactly once, validates callback/expiry, exchanges/stores/identifies through the OAuth gateway, validates scopes, clears in-memory flow, and reports only `SanitizedChannelConnection` through `ConnectionEventSink`. `disconnect` attempts revoke, always deletes the local credential in `finally`, reports `revocationUncertain = not revoke_result`, and retains nonsecret history.

```python
class YouTubeOAuthService:
    async def disconnect(self, connection_id: str) -> DisconnectResult:
        revoked = False
        try:
            revoked = await self._gateway.revoke(connection_id)
        finally:
            await self._vault.delete(connection_id)
        result = DisconnectResult(
            connection_id=connection_id,
            revocation_uncertain=not revoked,
        )
        await self._events.disconnected(result)
        return result

    async def complete(self, callback: OAuthCallback) -> SanitizedChannelConnection:
        state_digest = hash_state(callback.state)
        active = self._active_flows.pop(state_digest, None)
        stored_connection_id = await self._state_store.consume(
            state_digest,
            self._clock.now(),
        )
        if active is None or stored_connection_id is None:
            raise OAuthSecurityError('OAuth state is missing or already consumed')
        if stored_connection_id != active.connection_id:
            raise OAuthSecurityError('OAuth state connection mismatch')
        validate_callback(
            host=callback.host,
            path=callback.path,
            supplied_state=callback.state,
            expected_state=active.state,
            now=self._clock.now(),
            expires_at=active.expires_at,
        )
        connection = await self._gateway.exchange_store_and_identify(
            active.connection_id,
            active.redirect_uri,
            callback.code,
            active.code_verifier,
        )
        validate_scopes(connection.granted_scopes)
        await self._events.connected(connection)
        return connection
```

```bash
uv run --directory apps/worker pytest tests/application/youtube_publishing/test_oauth_service.py -q
```

Expected GREEN: PASS.

- [ ] **REFACTOR 3.4 — Split flow memory from use-case policy.**

Keep `ActiveOAuthFlowStore` as a process-memory adapter interface with `put/pop` and no serialization method. Add denial, mismatch, expired, already-consumed, and missing-scope tests before refactoring. Rerun all Task 6 tests and import-linter.

## Broader verification

- [ ] Run:

```bash
uv run --directory apps/worker pytest tests/domain/youtube_publishing tests/application/youtube_publishing -q
uv run --directory apps/worker pytest tests/domain/youtube_publishing tests/application/youtube_publishing --cov=clip_factory.domain.youtube_publishing --cov=clip_factory.application.youtube_publishing --cov-report=term-missing
uv run --directory apps/worker ruff check src tests
uv run --directory apps/worker mypy src
uv run --directory apps/worker lint-imports
pnpm test:architecture
git diff --check
```

- [ ] Require complete branch coverage for exact host/path, state mismatch, expiry, consume-once, missing scope, broad scope, denial, revoke failure, and redaction.
- [ ] Search Temporal payload and event types and confirm none contains a token/code/verifier/client-secret field.

## Review gate

Approve only when pure tests prove the security properties, raw state/verifier live only in process memory, ports cannot return tokens to application code, disconnect always deletes local credentials, and domain/application modules import no adapter dependency.

## Suggested commit

```text
feat(worker): define native YouTube OAuth security boundary
```
