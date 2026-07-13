from dataclasses import dataclass
from datetime import datetime
from urllib.parse import urlencode

from clip_factory.ports.youtube_publishing.oauth import SanitizedChannelConnection
from clip_factory.ports.youtube_publishing.runtime import (
    ActiveOAuthFlow,
    LoopbackOAuthCallback,
)


class FakeGateway:
    def __init__(
        self, connection: SanitizedChannelConnection, revoke_result: bool
    ) -> None:
        self.connection, self.revoke_result = connection, revoke_result
        self.exchanges: list[tuple[str, str, str, str]] = []
        self.revoked: list[str] = []

    async def create_authorization_request(
        self, connection_id: str, redirect_uri: str, state: str, code_challenge: str
    ) -> str:
        return "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(
            {
                "state": state,
                "code_challenge": code_challenge,
                "redirect_uri": redirect_uri,
            }
        )

    async def exchange_store_and_identify(
        self,
        connection_id: str,
        redirect_uri: str,
        authorization_code: str,
        code_verifier: str,
    ) -> SanitizedChannelConnection:
        self.exchanges.append(
            (connection_id, redirect_uri, authorization_code, code_verifier)
        )
        return self.connection

    async def refresh_and_check(self, connection_id: str) -> SanitizedChannelConnection:
        return self.connection

    async def revoke(self, connection_id: str) -> bool:
        self.revoked.append(connection_id)
        return self.revoke_result


class FakeVault:
    def __init__(self) -> None:
        self.deleted: list[str] = []

    async def contains(self, connection_id: str) -> bool:
        return connection_id not in self.deleted

    async def delete(self, connection_id: str) -> None:
        self.deleted.append(connection_id)


class FakeStateStore:
    def __init__(self) -> None:
        self.entries: dict[str, tuple[str, datetime]] = {}
        self.raw_states: list[str] = []

    async def put(
        self, state_digest: str, connection_id: str, expires_at: datetime
    ) -> None:
        self.entries[state_digest] = (connection_id, expires_at)

    async def consume(self, state_digest: str, now: datetime) -> str | None:
        entry = self.entries.pop(state_digest, None)
        return None if entry is None or now >= entry[1] else entry[0]


class FakeBrowser:
    def __init__(self) -> None:
        self.opened: list[str] = []

    async def open(self, url: str) -> None:
        self.opened.append(url)


class FakeEvents:
    def __init__(self) -> None:
        self.connected_events: list[SanitizedChannelConnection] = []
        self.disconnected_events: list[object] = []

    async def connected(self, connection: SanitizedChannelConnection) -> None:
        self.connected_events.append(connection)

    async def disconnected(self, result: object) -> None:
        self.disconnected_events.append(result)


class FakeClock:
    def __init__(self, now: datetime) -> None:
        self.value = now

    def now(self) -> datetime:
        return self.value


class FakeEntropy:
    def bytes(self, size: int) -> bytes:
        return bytes(range(size))


class FakeLoopbackListener:
    def __init__(
        self,
        redirect_uri: str,
        callback_code: str | None,
        callback_state: str | None,
    ) -> None:
        self.redirect_uri = redirect_uri
        self.callback_code = callback_code
        self.callback_state = callback_state

    async def bind(self) -> str:
        return self.redirect_uri

    async def wait_for_callback(self) -> LoopbackOAuthCallback:
        if self.callback_code is None or self.callback_state is None:
            raise TimeoutError("OAuth callback timed out")
        return LoopbackOAuthCallback(
            code=self.callback_code,
            state=self.callback_state,
        )


class FakeActiveOAuthFlowStore:
    def __init__(self) -> None:
        self.flows: dict[str, ActiveOAuthFlow] = {}

    def put(self, state_digest: str, flow: ActiveOAuthFlow) -> None:
        self.flows[state_digest] = flow

    def pop(self, state_digest: str) -> ActiveOAuthFlow | None:
        return self.flows.pop(state_digest, None)


@dataclass(frozen=True)
class OAuthFakes:
    dependencies: dict[str, object]
    gateway: FakeGateway
    vault: FakeVault
    state_store: FakeStateStore
    browser: FakeBrowser
    events: FakeEvents
    clock: FakeClock
    active_flows: FakeActiveOAuthFlowStore


def make_oauth_fakes(
    now: datetime,
    revoke_result: bool = True,
    redirect_uri: str = "http://127.0.0.1:49152/oauth2/callback",
    callback_code: str | None = None,
    callback_state: str | None = None,
) -> OAuthFakes:
    connection = SanitizedChannelConnection(
        connection_id="018f4f2c-93d7-7c75-8f0f-7f5165e8bb42",
        channel_id="channel-1",
        channel_title="Clip Factory",
        channel_handle="@clipfactory",
        avatar_url=None,
        granted_scopes=(
            "https://www.googleapis.com/auth/youtube.upload",
            "https://www.googleapis.com/auth/youtube.readonly",
        ),
        oauth_mode="desktop_pkce",
        refresh_token_expires_at=None,
    )
    gateway, vault, state_store, browser, events, clock, active_flows = (
        FakeGateway(connection, revoke_result),
        FakeVault(),
        FakeStateStore(),
        FakeBrowser(),
        FakeEvents(),
        FakeClock(now),
        FakeActiveOAuthFlowStore(),
    )
    return OAuthFakes(
        {
            "gateway": gateway,
            "vault": vault,
            "state_store": state_store,
            "browser": browser,
            "events": events,
            "clock": clock,
            "entropy": FakeEntropy(),
            "loopback_listener": FakeLoopbackListener(
                redirect_uri,
                callback_code,
                callback_state,
            ),
            "active_flows": active_flows,
        },
        gateway,
        vault,
        state_store,
        browser,
        events,
        clock,
        active_flows,
    )
