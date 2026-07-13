import asyncio
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import UTC, datetime
from urllib.parse import parse_qs, urlsplit

import httpx
import pytest
from pydantic import SecretStr
from pytest_httpserver import HTTPServer
from werkzeug.wrappers import Request, Response

from clip_factory.adapters.youtube.google_error import (
    ConnectedChannelNotFoundError,
    GoogleWorkspacePolicyError,
    MissingOAuthScopeError,
    OAuthConsentDeniedError,
    ReauthRequiredError,
)
from clip_factory.adapters.youtube.google_oauth_gateway import (
    GoogleOAuthGateway,
    GoogleOAuthGatewayConfig,
)
from clip_factory.domain.youtube_publishing.oauth_policy import REQUIRED_YOUTUBE_SCOPES


@dataclass(slots=True)
class FakeRefreshTokenVault:
    values: dict[str, str] = field(default_factory=dict)

    async def replace_refresh_token(self, connection_id: str, token: SecretStr) -> None:
        self.values[connection_id] = token.get_secret_value()

    async def read_refresh_token(self, connection_id: str) -> SecretStr:
        return SecretStr(self.values[connection_id])


@pytest.fixture
def fake_keychain() -> FakeRefreshTokenVault:
    return FakeRefreshTokenVault()


def make_google_oauth_gateway(
    httpserver: HTTPServer,
    fake_keychain: FakeRefreshTokenVault,
    *,
    revoke_endpoint: str | None = None,
) -> GoogleOAuthGateway:
    return GoogleOAuthGateway(
        http=httpx.AsyncClient(),
        vault=fake_keychain,
        config=GoogleOAuthGatewayConfig(
            client_id="desktop-id",
            client_secret=SecretStr("sentinel-client-secret"),
            authorization_endpoint=httpserver.url_for("/auth"),
            token_endpoint=httpserver.url_for("/token"),
            revoke_endpoint=revoke_endpoint or httpserver.url_for("/revoke"),
            youtube_api_base_url=httpserver.url_for("/youtube"),
        ),
        now=lambda: datetime(2026, 7, 13, tzinfo=UTC),
    )


def token_success(*, scope: str | None = None, include_refresh: bool = True) -> dict[str, object]:
    payload: dict[str, object] = {
        "access_token": "sentinel-access",
        "expires_in": 3600,
        "scope": scope or " ".join(REQUIRED_YOUTUBE_SCOPES),
        "token_type": "Bearer",
    }
    if include_refresh:
        payload["refresh_token"] = "sentinel-refresh"
        payload["refresh_token_expires_in"] = 604800
    return payload


def channel_success() -> dict[str, object]:
    return {
        "items": [
            {
                "id": "UC-safe-channel",
                "snippet": {
                    "title": "Clip Factory Test",
                    "customUrl": "@clipfactorytest",
                    "thumbnails": {
                        "default": {"url": "https://yt3.ggpht.com/safe"}
                    },
                },
            }
        ],
    }


def capture_request(
    target: list[Request],
) -> tuple[Callable[[Request, Response], Response], list[Request]]:
    def hook(request: Request, response: Response) -> Response:
        target.append(request)
        return response

    return hook, target


def test_authorization_url_uses_exact_desktop_oauth_parameters(
    httpserver: HTTPServer,
    fake_keychain: FakeRefreshTokenVault,
) -> None:
    async def scenario() -> None:
        gateway = make_google_oauth_gateway(httpserver, fake_keychain)

        url = await gateway.create_authorization_request(
            "connection-1",
            "http://127.0.0.1:43123/oauth2/callback",
            "state-1",
            "challenge-1",
        )

        parsed = urlsplit(url)
        query = parse_qs(parsed.query)
        assert url.startswith(httpserver.url_for("/auth"))
        assert set(query) == {
            "client_id",
            "redirect_uri",
            "response_type",
            "scope",
            "access_type",
            "prompt",
            "state",
            "code_challenge",
            "code_challenge_method",
        }
        assert query["client_id"] == ["desktop-id"]
        assert query["redirect_uri"] == [
            "http://127.0.0.1:43123/oauth2/callback"
        ]
        assert query["response_type"] == ["code"]
        assert query["scope"] == [" ".join(REQUIRED_YOUTUBE_SCOPES)]
        assert query["access_type"] == ["offline"]
        assert query["prompt"] == ["consent"]
        assert query["state"] == ["state-1"]
        assert query["code_challenge"] == ["challenge-1"]
        assert query["code_challenge_method"] == ["S256"]
        assert "client_secret" not in query

    asyncio.run(scenario())


def test_exchange_stores_refresh_token_keeps_access_token_in_memory_and_returns_channel(
    httpserver: HTTPServer,
    fake_keychain: FakeRefreshTokenVault,
) -> None:
    async def scenario() -> None:
        token_requests: list[Request] = []
        channel_requests: list[Request] = []
        token_hook, _ = capture_request(token_requests)
        channel_hook, _ = capture_request(channel_requests)
        token_handler = httpserver.expect_oneshot_request("/token", method="POST")
        token_handler.with_post_hook(token_hook).respond_with_json(token_success())
        channel_handler = httpserver.expect_oneshot_request(
            "/youtube/v3/channels",
            method="GET",
            query_string={"part": "snippet", "mine": "true"},
        )
        channel_handler.with_post_hook(channel_hook).respond_with_json(
            channel_success()
        )
        gateway = make_google_oauth_gateway(httpserver, fake_keychain)

        connection = await gateway.exchange_store_and_identify(
            "connection-1",
            "http://127.0.0.1:43123/oauth2/callback",
            "code-1",
            "verifier-1",
        )

        assert fake_keychain.values == {"connection-1": "sentinel-refresh"}
        assert connection.channel_id == "UC-safe-channel"
        assert connection.channel_title == "Clip Factory Test"
        assert connection.channel_handle == "@clipfactorytest"
        assert connection.avatar_url == "https://yt3.ggpht.com/safe"
        assert connection.granted_scopes == REQUIRED_YOUTUBE_SCOPES
        assert connection.oauth_mode == "testing"
        assert "sentinel-access" not in repr(connection)
        token_body = parse_qs(token_requests[0].get_data(as_text=True))
        assert token_body["grant_type"] == ["authorization_code"]
        assert token_body["code"] == ["code-1"]
        assert token_body["code_verifier"] == ["verifier-1"]
        assert token_body["redirect_uri"] == [
            "http://127.0.0.1:43123/oauth2/callback"
        ]
        assert channel_requests[0].headers["Authorization"] == "Bearer sentinel-access"

    asyncio.run(scenario())


def test_refresh_after_gateway_restart_and_invalid_grant_mapping(
    httpserver: HTTPServer,
    fake_keychain: FakeRefreshTokenVault,
) -> None:
    async def scenario() -> None:
        fake_keychain.values["connection-1"] = "sentinel-refresh"
        httpserver.expect_oneshot_request("/token", method="POST").respond_with_json(
            token_success(include_refresh=False)
        )
        httpserver.expect_oneshot_request(
            "/youtube/v3/channels",
            method="GET",
            query_string={"part": "snippet", "mine": "true"},
        ).respond_with_json(channel_success())
        gateway = make_google_oauth_gateway(httpserver, fake_keychain)

        await gateway.refresh_and_check("connection-1")

        httpserver.expect_oneshot_request("/token", method="POST").respond_with_json(
            {"error": "invalid_grant"},
            status=400,
        )
        restarted = make_google_oauth_gateway(httpserver, fake_keychain)
        with pytest.raises(ReauthRequiredError):
            await restarted.refresh_and_check("connection-1")

    asyncio.run(scenario())


@pytest.mark.parametrize(
    ("scenario_name", "expected"),
    [
        ("missing_scope", MissingOAuthScopeError),
        ("consent_denied", OAuthConsentDeniedError),
        ("empty_channel", ConnectedChannelNotFoundError),
        ("workspace_policy_denied", GoogleWorkspacePolicyError),
        ("revoke_network_failure", False),
        ("revoke_200", True),
    ],
)
def test_gateway_contract_cases(
    scenario_name: str,
    expected: type[Exception] | bool,
    httpserver: HTTPServer,
    fake_keychain: FakeRefreshTokenVault,
    caplog: pytest.LogCaptureFixture,
) -> None:
    async def scenario() -> None:
        gateway = configure_gateway_scenario(
            httpserver, fake_keychain, scenario_name
        )
        if isinstance(expected, type) and issubclass(expected, Exception):
            with pytest.raises(expected):
                await exercise_gateway_scenario(gateway, scenario_name)
        else:
            assert await exercise_gateway_scenario(gateway, scenario_name) is expected

    asyncio.run(scenario())
    for sentinel in (
        "sentinel-access",
        "sentinel-refresh",
        "code-1",
        "verifier-1",
        "sentinel-client-secret",
    ):
        assert sentinel not in caplog.text


def configure_gateway_scenario(
    httpserver: HTTPServer,
    fake_keychain: FakeRefreshTokenVault,
    scenario_name: str,
) -> GoogleOAuthGateway:
    if scenario_name == "missing_scope":
        httpserver.expect_oneshot_request("/token", method="POST").respond_with_json(
            token_success(
                scope="https://www.googleapis.com/auth/youtube.upload",
            )
        )
    elif scenario_name == "consent_denied":
        httpserver.expect_oneshot_request("/token", method="POST").respond_with_json(
            {"error": "access_denied"},
            status=400,
        )
    elif scenario_name == "empty_channel":
        httpserver.expect_oneshot_request("/token", method="POST").respond_with_json(
            token_success()
        )
        httpserver.expect_oneshot_request(
            "/youtube/v3/channels",
            method="GET",
            query_string={"part": "snippet", "mine": "true"},
        ).respond_with_json({"items": []})
    elif scenario_name == "workspace_policy_denied":
        httpserver.expect_oneshot_request("/token", method="POST").respond_with_json(
            token_success()
        )
        httpserver.expect_oneshot_request(
            "/youtube/v3/channels",
            method="GET",
            query_string={"part": "snippet", "mine": "true"},
        ).respond_with_json(
            {"error": {"errors": [{"reason": "domainPolicy"}]}},
            status=403,
        )
    elif scenario_name == "revoke_network_failure":
        fake_keychain.values["connection-1"] = "sentinel-refresh"
        httpserver.expect_oneshot_request("/revoke", method="POST").respond_with_data(
            "unavailable",
            status=503,
        )
    elif scenario_name == "revoke_200":
        fake_keychain.values["connection-1"] = "sentinel-refresh"
        httpserver.expect_oneshot_request("/revoke", method="POST").respond_with_data(
            "",
            status=200,
        )
    else:
        raise AssertionError(f"unknown scenario: {scenario_name}")
    return make_google_oauth_gateway(httpserver, fake_keychain)


async def exercise_gateway_scenario(
    gateway: GoogleOAuthGateway,
    scenario_name: str,
) -> object:
    if scenario_name.startswith("revoke_"):
        return await gateway.revoke("connection-1")
    return await gateway.exchange_store_and_identify(
        "connection-1",
        "http://127.0.0.1:43123/oauth2/callback",
        "code-1",
        "verifier-1",
    )
