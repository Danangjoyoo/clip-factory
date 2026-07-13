import asyncio
from datetime import UTC, datetime, timedelta
import json

from clip_factory.adapters.youtube.redis_oauth_state_store import (
    RedisOAuthStateStore,
)


class FakeRedis:
    def __init__(self) -> None:
        self.values: dict[str, str] = {}
        self.expirations: dict[str, int] = {}

    async def set(self, name: str, value: str, *, ex: int) -> bool:
        self.values[name] = value
        self.expirations[name] = ex
        return True

    async def getdel(self, name: str) -> str | None:
        return self.values.pop(name, None)


def test_stores_only_state_digest_key_with_bounded_ttl() -> None:
    async def scenario() -> None:
        now = datetime(2026, 7, 13, 12, 0, tzinfo=UTC)
        redis = FakeRedis()
        store = RedisOAuthStateStore(redis=redis, now=lambda: now)

        await store.put(
            "digest-1",
            "018f4f2c-93d7-7c75-8f0f-7f5165e8bb42",
            now + timedelta(minutes=10, seconds=30),
        )

        key = "clip-factory:youtube-oauth-state:digest-1"
        assert set(redis.values) == {key}
        assert redis.expirations[key] == 600
        payload = json.loads(redis.values[key])
        assert payload == {
            "connectionId": "018f4f2c-93d7-7c75-8f0f-7f5165e8bb42",
            "expiresAt": "2026-07-13T12:10:30+00:00",
        }

    asyncio.run(scenario())


def test_consume_returns_connection_once_and_rejects_expired_entries() -> None:
    async def scenario() -> None:
        now = datetime(2026, 7, 13, 12, 0, tzinfo=UTC)
        redis = FakeRedis()
        store = RedisOAuthStateStore(redis=redis, now=lambda: now)
        expires_at = now + timedelta(minutes=5)
        await store.put("digest-1", "connection-1", expires_at)

        assert await store.consume("digest-1", now) == "connection-1"
        assert await store.consume("digest-1", now) is None

        await store.put("digest-2", "connection-2", expires_at)
        assert await store.consume("digest-2", expires_at) is None

    asyncio.run(scenario())
