import asyncio
from datetime import UTC, datetime, timedelta
from urllib.parse import parse_qs, urlsplit

import pytest

from clip_factory.application.youtube_publishing.oauth_service import OAuthCallback, YouTubeOAuthService
from clip_factory.application.youtube_publishing.active_oauth_flow_store import InMemoryActiveOAuthFlowStore
from clip_factory.domain.youtube_publishing.oauth_policy import OAuthSecurityError
from clip_factory.ports.youtube_publishing.runtime import ActiveOAuthFlow
from fakes.youtube_publishing import make_oauth_fakes


CONNECTION_ID = "018f4f2c-93d7-7c75-8f0f-7f5165e8bb42"


def test_process_memory_flow_store_pop_is_one_time_and_has_no_serialization_method() -> None:
    store = InMemoryActiveOAuthFlowStore()
    flow = ActiveOAuthFlow(
        CONNECTION_ID,
        "state",
        "verifier",
        "http://127.0.0.1:1/oauth2/callback",
        datetime(2026, 7, 11, tzinfo=UTC),
    )
    store.put("digest", flow)
    assert store.pop("digest") == flow
    assert store.pop("digest") is None
    assert not hasattr(store, "serialize")


def test_begin_stores_only_digest_then_opens_system_browser() -> None:
    fakes = make_oauth_fakes(now=datetime(2026, 7, 11, tzinfo=UTC))
    service = YouTubeOAuthService(**fakes.dependencies)
    result = asyncio.run(service.begin(CONNECTION_ID))
    assert fakes.state_store.entries == {
        result.state_digest: (CONNECTION_ID, datetime(2026, 7, 11, 0, 10, tzinfo=UTC))
    }
    assert len(fakes.browser.opened) == 1
    assert "state=" in fakes.browser.opened[0]
    assert result.authorization_display_url == "https://accounts.google.com/o/oauth2/v2/auth"
    assert "?" not in result.authorization_display_url
    assert fakes.state_store.raw_states == []
    assert set(fakes.active_flows.flows) == {result.state_digest}


@pytest.mark.parametrize(
    "redirect_uri",
    (
        "http://localhost:49152/oauth2/callback",
        "https://127.0.0.1:49152/oauth2/callback",
        "http://example.com:49152/oauth2/callback",
        "http://127.0.0.1:49152/not-callback",
    ),
)
def test_begin_rejects_non_exact_loopback_callback_uri(redirect_uri: str) -> None:
    fakes = make_oauth_fakes(now=datetime(2026, 7, 11, tzinfo=UTC), redirect_uri=redirect_uri)
    service = YouTubeOAuthService(**fakes.dependencies)
    with pytest.raises(OAuthSecurityError, match="unexpected OAuth callback target"):
        asyncio.run(service.begin(CONNECTION_ID))
    assert fakes.state_store.entries == {}
    assert fakes.browser.opened == []


def test_complete_consumes_state_once_validates_scope_and_reports_sanitized_connection() -> None:
    fakes = make_oauth_fakes(now=datetime(2026, 7, 11, tzinfo=UTC))
    service = YouTubeOAuthService(**fakes.dependencies)
    asyncio.run(service.begin(CONNECTION_ID))
    query = parse_qs(urlsplit(fakes.browser.opened[0]).query)
    callback = OAuthCallback(
        host="127.0.0.1", path="/oauth2/callback", state=query["state"][0], code="short-lived-code"
    )
    connection = asyncio.run(service.complete(callback))
    assert connection.channel_id == "channel-1"
    assert fakes.events.connected_events == [connection]
    with pytest.raises(OAuthSecurityError, match="missing or already consumed"):
        asyncio.run(service.complete(callback))


def test_complete_rejects_denial_mismatch_expiry_and_bad_scope() -> None:
    fakes = make_oauth_fakes(now=datetime(2026, 7, 11, tzinfo=UTC))
    service = YouTubeOAuthService(**fakes.dependencies)
    asyncio.run(service.begin(CONNECTION_ID))
    state = parse_qs(urlsplit(fakes.browser.opened[0]).query)["state"][0]
    with pytest.raises(OAuthSecurityError, match="authorization denied"):
        asyncio.run(service.complete(OAuthCallback("127.0.0.1", "/oauth2/callback", state, None, "access_denied")))
    asyncio.run(service.begin(CONNECTION_ID))
    with pytest.raises(OAuthSecurityError, match="missing or already consumed"):
        asyncio.run(service.complete(OAuthCallback("127.0.0.1", "/oauth2/callback", "wrong", "code")))
    asyncio.run(service.begin(CONNECTION_ID))
    fakes.clock.value += timedelta(minutes=11)
    state = parse_qs(urlsplit(fakes.browser.opened[-1]).query)["state"][0]
    with pytest.raises(OAuthSecurityError, match="missing or already consumed"):
        asyncio.run(service.complete(OAuthCallback("127.0.0.1", "/oauth2/callback", state, "code")))


def test_complete_rejects_state_bound_to_other_connection() -> None:
    fakes = make_oauth_fakes(now=datetime(2026, 7, 11, tzinfo=UTC))
    service = YouTubeOAuthService(**fakes.dependencies)
    result = asyncio.run(service.begin(CONNECTION_ID))
    fakes.state_store.entries[result.state_digest] = (
        "other-connection",
        datetime(2026, 7, 11, 0, 10, tzinfo=UTC),
    )
    state = parse_qs(urlsplit(fakes.browser.opened[-1]).query)["state"][0]
    with pytest.raises(OAuthSecurityError, match="OAuth state connection mismatch"):
        asyncio.run(service.complete(OAuthCallback("127.0.0.1", "/oauth2/callback", state, "code")))


def test_disconnect_deletes_vault_even_when_remote_revoke_fails() -> None:
    fakes = make_oauth_fakes(now=datetime(2026, 7, 11, tzinfo=UTC), revoke_result=False)
    service = YouTubeOAuthService(**fakes.dependencies)
    result = asyncio.run(service.disconnect(CONNECTION_ID))
    assert fakes.vault.deleted == [CONNECTION_ID]
    assert result.revocation_uncertain is True


def test_refresh_checks_granted_scope_before_reporting_connection() -> None:
    fakes = make_oauth_fakes(now=datetime(2026, 7, 11, tzinfo=UTC))
    service = YouTubeOAuthService(**fakes.dependencies)
    connection = asyncio.run(service.refresh(CONNECTION_ID))
    assert connection == fakes.gateway.connection
    assert fakes.events.connected_events == [connection]
