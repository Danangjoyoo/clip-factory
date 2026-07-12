from dataclasses import dataclass
from datetime import datetime, timedelta
from urllib.parse import urlsplit, urlunsplit

from clip_factory.domain.youtube_publishing.oauth_policy import (
    OAuthSecurityError,
    create_pkce,
    create_state,
    hash_state,
    validate_callback,
    validate_scopes,
)
from clip_factory.ports.youtube_publishing.connection_event_sink import ConnectionEventSink
from clip_factory.ports.youtube_publishing.credential_vault import CredentialVault
from clip_factory.ports.youtube_publishing.oauth import (
    AuthorizationRequest,
    SanitizedChannelConnection,
    YouTubeOAuthGateway,
)
from clip_factory.ports.youtube_publishing.oauth_state_store import OAuthStateStore
from clip_factory.ports.youtube_publishing.runtime import Clock, EntropySource, LoopbackListener
from clip_factory.ports.youtube_publishing.system_browser import SystemBrowser


@dataclass(frozen=True, slots=True)
class OAuthCallback:
    host: str
    path: str
    state: str
    code: str | None
    error: str | None = None


@dataclass(frozen=True, slots=True)
class DisconnectResult:
    connection_id: str
    revocation_uncertain: bool


@dataclass(frozen=True, slots=True)
class ActiveOAuthFlow:
    connection_id: str
    state: str
    code_verifier: str
    redirect_uri: str
    expires_at: datetime


class YouTubeOAuthService:
    def __init__(
        self,
        gateway: YouTubeOAuthGateway,
        vault: CredentialVault,
        state_store: OAuthStateStore,
        browser: SystemBrowser,
        events: ConnectionEventSink,
        clock: Clock,
        entropy: EntropySource,
        loopback_listener: LoopbackListener,
    ) -> None:
        self._gateway = gateway
        self._vault = vault
        self._state_store = state_store
        self._browser = browser
        self._events = events
        self._clock = clock
        self._entropy = entropy
        self._loopback_listener = loopback_listener
        self._active_flows: dict[str, ActiveOAuthFlow] = {}

    async def begin(self, connection_id: str) -> AuthorizationRequest:
        redirect_uri = await self._loopback_listener.bind()
        now = self._clock.now()
        expires_at = now + timedelta(minutes=10)
        state = create_state(self._entropy.bytes)
        verifier, challenge = create_pkce(self._entropy.bytes)
        state_digest = hash_state(state)
        self._active_flows[state_digest] = ActiveOAuthFlow(
            connection_id, state, verifier, redirect_uri, expires_at
        )
        await self._state_store.put(state_digest, connection_id, expires_at)
        full_url = await self._gateway.create_authorization_request(
            connection_id, redirect_uri, state, challenge
        )
        await self._browser.open(full_url)
        parsed = urlsplit(full_url)
        return AuthorizationRequest(
            urlunsplit((parsed.scheme, parsed.netloc, parsed.path, "", "")),
            state_digest,
            expires_at,
        )

    async def complete(self, callback: OAuthCallback) -> SanitizedChannelConnection:
        state_digest = hash_state(callback.state)
        active = self._active_flows.pop(state_digest, None)
        stored_connection_id = await self._state_store.consume(state_digest, self._clock.now())
        if active is None or stored_connection_id is None:
            raise OAuthSecurityError("OAuth state is missing or already consumed")
        if stored_connection_id != active.connection_id:
            raise OAuthSecurityError("OAuth state connection mismatch")
        validate_callback(
            host=callback.host,
            path=callback.path,
            supplied_state=callback.state,
            expected_state=active.state,
            now=self._clock.now(),
            expires_at=active.expires_at,
        )
        if callback.error is not None or callback.code is None:
            raise OAuthSecurityError("OAuth authorization denied")
        connection = await self._gateway.exchange_store_and_identify(
            active.connection_id, active.redirect_uri, callback.code, active.code_verifier
        )
        validate_scopes(connection.granted_scopes)
        await self._events.connected(connection)
        return connection

    async def refresh(self, connection_id: str) -> SanitizedChannelConnection:
        connection = await self._gateway.refresh_and_check(connection_id)
        validate_scopes(connection.granted_scopes)
        await self._events.connected(connection)
        return connection

    async def disconnect(self, connection_id: str) -> DisconnectResult:
        revoked = False
        try:
            revoked = await self._gateway.revoke(connection_id)
        finally:
            await self._vault.delete(connection_id)
        result = DisconnectResult(connection_id, revocation_uncertain=not revoked)
        await self._events.disconnected(result)
        return result
