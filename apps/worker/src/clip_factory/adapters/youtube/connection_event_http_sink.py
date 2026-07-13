from datetime import UTC, datetime
from typing import Any

import httpx
from pydantic import SecretStr

from clip_factory.entrypoints.contracts.generated.youtube_publishing import (
    YouTubeConnectionEventV1,
)
from clip_factory.ports.youtube_publishing.oauth import SanitizedChannelConnection


class ConnectionEventSinkError(RuntimeError):
    pass


class ConnectionEventHttpSink:
    def __init__(
        self,
        *,
        http: httpx.AsyncClient,
        event_endpoint: str,
        internal_service_token: SecretStr,
    ) -> None:
        self._http = http
        self._event_endpoint = event_endpoint
        self._internal_service_token = internal_service_token

    async def connected(self, connection: SanitizedChannelConnection) -> None:
        await self._post_event(
            {
                "contractVersion": 1,
                "type": "CONNECTED",
                "connectionId": connection.connection_id,
                "channelId": connection.channel_id,
                "channelTitle": connection.channel_title,
                "channelHandle": connection.channel_handle,
                "avatarUrl": connection.avatar_url,
                "grantedScopes": list(connection.granted_scopes),
                "oauthMode": _oauth_mode(connection.oauth_mode),
                "refreshTokenExpiresAt": _iso_datetime(
                    connection.refresh_token_expires_at
                ),
            }
        )

    async def disconnected(self, result: object) -> None:
        await self._post_event(
            {
                "contractVersion": 1,
                "type": "DISCONNECTED",
                "connectionId": _required_string_attr(result, "connection_id"),
                "revocationUncertain": _required_bool_attr(
                    result, "revocation_uncertain"
                ),
            }
        )

    async def failed(self, connection_id: str, reason_code: str) -> None:
        await self._post_event(
            {
                "contractVersion": 1,
                "type": "FAILED",
                "connectionId": connection_id,
                "reasonCode": reason_code,
            }
        )

    async def _post_event(self, payload: dict[str, Any]) -> None:
        YouTubeConnectionEventV1.model_validate(payload)
        response = await self._http.post(
            self._event_endpoint,
            json=payload,
            headers={
                "Authorization": (
                    "Bearer "
                    + self._internal_service_token.get_secret_value()
                ),
                "Idempotency-Key": _idempotency_key(payload),
            },
            timeout=httpx.Timeout(10.0),
        )
        if response.status_code >= 400:
            raise ConnectionEventSinkError("connection event delivery failed")


def _oauth_mode(value: str) -> str:
    normalized = value.upper()
    if normalized in {"TESTING", "PRODUCTION"}:
        return normalized
    return "UNKNOWN"


def _idempotency_key(payload: dict[str, Any]) -> str:
    connection_id = _required_string_attr_dict(payload, "connectionId")
    event_type = _required_string_attr_dict(payload, "type")
    return f"oauth-result:{connection_id}:{event_type}"


def _iso_datetime(value: datetime | None) -> str | None:
    if value is None:
        return None
    return value.astimezone(UTC).isoformat().replace("+00:00", "Z")


def _required_string_attr(value: object, name: str) -> str:
    attribute = getattr(value, name)
    if not isinstance(attribute, str):
        raise TypeError(f"{name} must be a string")
    return attribute


def _required_string_attr_dict(value: dict[str, Any], name: str) -> str:
    attribute = value[name]
    if not isinstance(attribute, str):
        raise TypeError(f"{name} must be a string")
    return attribute


def _required_bool_attr(value: object, name: str) -> bool:
    attribute = getattr(value, name)
    if not isinstance(attribute, bool):
        raise TypeError(f"{name} must be a boolean")
    return attribute
