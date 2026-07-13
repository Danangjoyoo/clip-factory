from datetime import datetime, timedelta
import json
import math
from typing import Protocol

from clip_factory.ports.youtube_publishing.oauth import SanitizedChannelConnection


class RedisCompletionReceiptBackend(Protocol):
    async def set(self, name: str, value: str, *, ex: int) -> object: ...

    async def get(self, name: str) -> str | bytes | None: ...


class RedisOAuthCompletionReceiptStore:
    def __init__(self, *, redis: RedisCompletionReceiptBackend) -> None:
        self._redis = redis

    async def get_connected(
        self,
        connection_id: str,
    ) -> SanitizedChannelConnection | None:
        raw = await self._redis.get(_key(connection_id))
        if raw is None:
            return None
        if isinstance(raw, bytes):
            raw = raw.decode("utf-8")
        try:
            payload = json.loads(raw)
            if set(payload) != _RECEIPT_KEYS:
                return None
            granted_scopes = payload["grantedScopes"]
            if not isinstance(granted_scopes, list) or not all(
                isinstance(scope, str) for scope in granted_scopes
            ):
                return None
            return SanitizedChannelConnection(
                connection_id=_required_string(payload, "connectionId"),
                channel_id=_required_string(payload, "channelId"),
                channel_title=_required_string(payload, "channelTitle"),
                channel_handle=_optional_string(payload, "channelHandle"),
                avatar_url=_optional_string(payload, "avatarUrl"),
                granted_scopes=tuple(granted_scopes),
                oauth_mode=_required_string(payload, "oauthMode"),
                refresh_token_expires_at=(
                    None
                    if payload["refreshTokenExpiresAt"] is None
                    else datetime.fromisoformat(
                        _required_string(payload, "refreshTokenExpiresAt")
                    )
                ),
            )
        except (TypeError, ValueError, json.JSONDecodeError):
            return None

    async def put_connected(
        self,
        connection: SanitizedChannelConnection,
        ttl: timedelta,
    ) -> None:
        ttl_seconds = max(1, math.ceil(ttl.total_seconds()))
        await self._redis.set(
            _key(connection.connection_id),
            json.dumps(
                {
                    "connectionId": connection.connection_id,
                    "channelId": connection.channel_id,
                    "channelTitle": connection.channel_title,
                    "channelHandle": connection.channel_handle,
                    "avatarUrl": connection.avatar_url,
                    "grantedScopes": list(connection.granted_scopes),
                    "oauthMode": connection.oauth_mode,
                    "refreshTokenExpiresAt": (
                        None
                        if connection.refresh_token_expires_at is None
                        else connection.refresh_token_expires_at.isoformat()
                    ),
                },
                separators=(",", ":"),
            ),
            ex=ttl_seconds,
        )


_RECEIPT_KEYS = {
    "connectionId",
    "channelId",
    "channelTitle",
    "channelHandle",
    "avatarUrl",
    "grantedScopes",
    "oauthMode",
    "refreshTokenExpiresAt",
}


def _key(connection_id: str) -> str:
    return f"clip-factory:youtube-oauth-completion:{connection_id}"


def _required_string(payload: dict[str, object], name: str) -> str:
    value = payload[name]
    if not isinstance(value, str):
        raise TypeError(f"{name} must be a string")
    return value


def _optional_string(payload: dict[str, object], name: str) -> str | None:
    value = payload[name]
    if value is None or isinstance(value, str):
        return value
    raise TypeError(f"{name} must be a string or null")

