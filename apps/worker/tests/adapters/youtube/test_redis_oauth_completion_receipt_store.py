import asyncio
from datetime import UTC, datetime, timedelta
import json

from clip_factory.adapters.youtube.redis_oauth_completion_receipt_store import (
    RedisOAuthCompletionReceiptStore,
)
from clip_factory.ports.youtube_publishing.oauth import SanitizedChannelConnection


class FakeRedis:
    def __init__(self) -> None:
        self.values: dict[str, str] = {}
        self.expirations: dict[str, int] = {}

    async def set(self, name: str, value: str, *, ex: int) -> bool:
        self.values[name] = value
        self.expirations[name] = ex
        return True

    async def get(self, name: str) -> str | None:
        return self.values.get(name)


def test_round_trips_sanitized_completion_receipt_with_ttl() -> None:
    async def scenario() -> None:
        redis = FakeRedis()
        store = RedisOAuthCompletionReceiptStore(redis=redis)
        connection = make_connection()

        await store.put_connected(connection, ttl=timedelta(hours=24))

        key = (
            "clip-factory:youtube-oauth-completion:"
            "018f4f2c-93d7-7c75-8f0f-7f5165e8bb42"
        )
        assert redis.expirations[key] == 86400
        payload = json.loads(redis.values[key])
        assert payload == {
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
            "refreshTokenExpiresAt": "2026-07-20T00:00:00+00:00",
        }
        assert await store.get_connected(connection.connection_id) == connection

    asyncio.run(scenario())


def test_rejects_receipts_with_credential_like_fields() -> None:
    async def scenario() -> None:
        redis = FakeRedis()
        store = RedisOAuthCompletionReceiptStore(redis=redis)
        redis.values[
            "clip-factory:youtube-oauth-completion:connection-1"
        ] = json.dumps(
            {
                "connectionId": "connection-1",
                "channelId": "UC-safe-channel",
                "channelTitle": "Clip Factory Test",
                "channelHandle": None,
                "avatarUrl": None,
                "grantedScopes": [
                    "https://www.googleapis.com/auth/youtube.upload",
                    "https://www.googleapis.com/auth/youtube.readonly",
                ],
                "oauthMode": "TESTING",
                "refreshTokenExpiresAt": None,
                "refreshToken": "sentinel",
            }
        )

        assert await store.get_connected("connection-1") is None

    asyncio.run(scenario())


def make_connection() -> SanitizedChannelConnection:
    return SanitizedChannelConnection(
        connection_id="018f4f2c-93d7-7c75-8f0f-7f5165e8bb42",
        channel_id="UC-safe-channel",
        channel_title="Clip Factory Test",
        channel_handle="@clipfactorytest",
        avatar_url="https://yt3.ggpht.com/safe",
        granted_scopes=(
            "https://www.googleapis.com/auth/youtube.upload",
            "https://www.googleapis.com/auth/youtube.readonly",
        ),
        oauth_mode="TESTING",
        refresh_token_expires_at=datetime(2026, 7, 20, tzinfo=UTC),
    )
