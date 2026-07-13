from collections.abc import Callable
from datetime import datetime
import json
import math
from typing import Protocol


class RedisStateBackend(Protocol):
    async def set(self, name: str, value: str, *, ex: int) -> object: ...

    async def getdel(self, name: str) -> str | bytes | None: ...


class RedisOAuthStateStore:
    def __init__(
        self, *, redis: RedisStateBackend, now: Callable[[], datetime]
    ) -> None:
        self._redis = redis
        self._now = now

    async def put(
        self, state_digest: str, connection_id: str, expires_at: datetime
    ) -> None:
        ttl = min(600, max(1, math.ceil((expires_at - self._now()).total_seconds())))
        await self._redis.set(
            _key(state_digest),
            json.dumps(
                {
                    "connectionId": connection_id,
                    "expiresAt": expires_at.isoformat(),
                },
                separators=(",", ":"),
            ),
            ex=ttl,
        )

    async def consume(self, state_digest: str, now: datetime) -> str | None:
        raw = await self._redis.getdel(_key(state_digest))
        if raw is None:
            return None
        if isinstance(raw, bytes):
            raw = raw.decode("utf-8")
        try:
            payload = json.loads(raw)
            expires_at = datetime.fromisoformat(payload["expiresAt"])
            connection_id = payload["connectionId"]
        except (KeyError, TypeError, ValueError, json.JSONDecodeError):
            return None
        if not isinstance(connection_id, str) or now >= expires_at:
            return None
        return connection_id


def _key(state_digest: str) -> str:
    return f"clip-factory:youtube-oauth-state:{state_digest}"
