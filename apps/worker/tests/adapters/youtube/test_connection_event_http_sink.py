import asyncio
from dataclasses import dataclass
from datetime import UTC, datetime
import json

import httpx
import pytest
from pydantic import SecretStr
from pytest_httpserver import HTTPServer
from werkzeug.wrappers import Request, Response

from clip_factory.adapters.youtube.connection_event_http_sink import (
    ConnectionEventHttpSink,
)
from clip_factory.ports.youtube_publishing.oauth import SanitizedChannelConnection


@dataclass(frozen=True, slots=True)
class DisconnectResult:
    connection_id: str
    revocation_uncertain: bool


def test_posts_connected_event_with_contract_payload_and_worker_auth(
    httpserver: HTTPServer,
    caplog: pytest.LogCaptureFixture,
) -> None:
    async def scenario() -> None:
        requests: list[Request] = []

        def capture(request: Request, response: Response) -> Response:
            requests.append(request)
            return response

        handler = httpserver.expect_oneshot_request(
            "/api/internal/youtube-publishing/connection-events",
            method="POST",
        )
        handler.with_post_hook(capture).respond_with_json({"ok": True})
        sink = ConnectionEventHttpSink(
            http=httpx.AsyncClient(),
            event_endpoint=httpserver.url_for(
                "/api/internal/youtube-publishing/connection-events"
            ),
            internal_service_token=SecretStr("sentinel-service-token"),
        )

        await sink.connected(
            SanitizedChannelConnection(
                connection_id="018f4f2c-93d7-7c75-8f0f-7f5165e8bb42",
                channel_id="UC-safe-channel",
                channel_title="Clip Factory Test",
                channel_handle="@clipfactorytest",
                avatar_url="https://yt3.ggpht.com/safe",
                granted_scopes=(
                    "https://www.googleapis.com/auth/youtube.upload",
                    "https://www.googleapis.com/auth/youtube.readonly",
                ),
                oauth_mode="testing",
                refresh_token_expires_at=datetime(2026, 7, 20, tzinfo=UTC),
            )
        )

        assert requests[0].headers["Authorization"] == "Bearer sentinel-service-token"
        payload = json.loads(requests[0].get_data(as_text=True))
        assert payload == {
            "contractVersion": 1,
            "type": "CONNECTED",
            "connectionId": "018f4f2c-93d7-7c75-8f0f-7f5165e8bb42",
            "channelId": "UC-safe-channel",
            "channelTitle": "Clip Factory Test",
            "channelHandle": "@clipfactorytest",
            "avatarUrl": "https://yt3.ggpht.com/safe",
            "grantedScopes": [
                "https://www.googleapis.com/auth/youtube.upload",
                "https://www.googleapis.com/auth/youtube.readonly",
            ],
            "oauthMode": "TESTING",
            "refreshTokenExpiresAt": "2026-07-20T00:00:00Z",
        }

    asyncio.run(scenario())
    assert "sentinel-service-token" not in caplog.text


def test_posts_disconnect_event_without_secret_fields(
    httpserver: HTTPServer,
) -> None:
    async def scenario() -> None:
        requests: list[Request] = []

        def capture(request: Request, response: Response) -> Response:
            requests.append(request)
            return response

        handler = httpserver.expect_oneshot_request(
            "/api/internal/youtube-publishing/connection-events",
            method="POST",
        )
        handler.with_post_hook(capture).respond_with_json({"ok": True})
        sink = ConnectionEventHttpSink(
            http=httpx.AsyncClient(),
            event_endpoint=httpserver.url_for(
                "/api/internal/youtube-publishing/connection-events"
            ),
            internal_service_token=SecretStr("sentinel-service-token"),
        )

        await sink.disconnected(
            DisconnectResult(
                connection_id="018f4f2c-93d7-7c75-8f0f-7f5165e8bb42",
                revocation_uncertain=True,
            )
        )

        payload = json.loads(requests[0].get_data(as_text=True))
        assert payload == {
            "contractVersion": 1,
            "type": "DISCONNECTED",
            "connectionId": "018f4f2c-93d7-7c75-8f0f-7f5165e8bb42",
            "revocationUncertain": True,
        }
        assert not {"accessToken", "refreshToken", "clientSecret"} & set(payload)

    asyncio.run(scenario())


def test_repeated_connected_delivery_uses_stable_idempotency_key(
    httpserver: HTTPServer,
) -> None:
    async def scenario() -> None:
        requests: list[Request] = []

        def capture(request: Request, response: Response) -> Response:
            requests.append(request)
            return response

        httpserver.expect_request(
            "/api/internal/youtube-publishing/connection-events",
            method="POST",
        ).with_post_hook(capture).respond_with_data(status=204)
        sink = ConnectionEventHttpSink(
            http=httpx.AsyncClient(),
            event_endpoint=httpserver.url_for(
                "/api/internal/youtube-publishing/connection-events"
            ),
            internal_service_token=SecretStr("sentinel-service-token"),
        )
        connection = SanitizedChannelConnection(
            connection_id="018f4f2c-93d7-7c75-8f0f-7f5165e8bb42",
            channel_id="UC-safe-channel",
            channel_title="Clip Factory Test",
            channel_handle="@clipfactorytest",
            avatar_url=None,
            granted_scopes=(
                "https://www.googleapis.com/auth/youtube.upload",
                "https://www.googleapis.com/auth/youtube.readonly",
            ),
            oauth_mode="TESTING",
            refresh_token_expires_at=None,
        )

        await sink.connected(connection)
        await sink.connected(connection)

        assert [request.headers["Idempotency-Key"] for request in requests] == [
            "oauth-result:018f4f2c-93d7-7c75-8f0f-7f5165e8bb42:CONNECTED",
            "oauth-result:018f4f2c-93d7-7c75-8f0f-7f5165e8bb42:CONNECTED",
        ]
        assert requests[0].get_data() == requests[1].get_data()

    asyncio.run(scenario())


def test_posts_failed_event_without_provider_error_body(
    httpserver: HTTPServer,
) -> None:
    async def scenario() -> None:
        requests: list[Request] = []

        def capture(request: Request, response: Response) -> Response:
            requests.append(request)
            return response

        httpserver.expect_oneshot_request(
            "/api/internal/youtube-publishing/connection-events",
            method="POST",
        ).with_post_hook(capture).respond_with_data(status=204)
        sink = ConnectionEventHttpSink(
            http=httpx.AsyncClient(),
            event_endpoint=httpserver.url_for(
                "/api/internal/youtube-publishing/connection-events"
            ),
            internal_service_token=SecretStr("sentinel-service-token"),
        )

        await sink.failed(
            "018f4f2c-93d7-7c75-8f0f-7f5165e8bb42",
            "CONSENT_DENIED",
        )

        payload = json.loads(requests[0].get_data(as_text=True))
        assert payload == {
            "contractVersion": 1,
            "type": "FAILED",
            "connectionId": "018f4f2c-93d7-7c75-8f0f-7f5165e8bb42",
            "reasonCode": "CONSENT_DENIED",
        }
        assert requests[0].headers["Idempotency-Key"] == (
            "oauth-result:018f4f2c-93d7-7c75-8f0f-7f5165e8bb42:FAILED"
        )

    asyncio.run(scenario())
