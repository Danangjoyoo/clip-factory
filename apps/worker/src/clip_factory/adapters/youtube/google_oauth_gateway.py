from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime
import logging
import time
from typing import Any, Protocol
from urllib.parse import urlencode

import httpx
from pydantic import SecretStr

from clip_factory.adapters.youtube.client_dto import (
    GoogleChannelsListClientDto,
    GoogleTokenClientDto,
)
from clip_factory.adapters.youtube.google_error import (
    ConnectedChannelNotFoundError,
    GoogleNetworkError,
    GoogleOAuthError,
    GoogleWorkspacePolicyError,
    MissingOAuthScopeError,
    OAuthConsentDeniedError,
    ReauthRequiredError,
)
from clip_factory.domain.youtube_publishing.oauth_policy import REQUIRED_YOUTUBE_SCOPES
from clip_factory.domain.youtube_publishing.redaction import redact_google_event
from clip_factory.ports.youtube_publishing.oauth import SanitizedChannelConnection
from clip_factory.converters.youtube_publishing.client_entity.google_oauth import (
    to_sanitized_channel_connection,
)


class RefreshTokenAccess(Protocol):
    async def replace_refresh_token(
        self, connection_id: str, token: SecretStr
    ) -> None: ...

    async def read_refresh_token(self, connection_id: str) -> SecretStr: ...


@dataclass(frozen=True, slots=True)
class GoogleOAuthGatewayConfig:
    client_id: str
    client_secret: SecretStr
    authorization_endpoint: str
    token_endpoint: str
    revoke_endpoint: str
    youtube_api_base_url: str


@dataclass(frozen=True, slots=True)
class InMemoryAccessToken:
    token: SecretStr
    expires_at_monotonic: float


class GoogleOAuthGateway:
    def __init__(
        self,
        *,
        http: httpx.AsyncClient,
        vault: RefreshTokenAccess,
        config: GoogleOAuthGatewayConfig,
        now: Callable[[], datetime],
    ) -> None:
        self._http = http
        self._vault = vault
        self._config = config
        self._now = now
        self._logger = logging.getLogger(__name__)
        self._access_tokens: dict[str, InMemoryAccessToken] = {}

    async def create_authorization_request(
        self, connection_id: str, redirect_uri: str, state: str, code_challenge: str
    ) -> str:
        del connection_id
        query = urlencode(
            {
                "client_id": self._config.client_id,
                "redirect_uri": redirect_uri,
                "response_type": "code",
                "scope": " ".join(REQUIRED_YOUTUBE_SCOPES),
                "access_type": "offline",
                "prompt": "consent",
                "state": state,
                "code_challenge": code_challenge,
                "code_challenge_method": "S256",
            }
        )
        return f"{self._config.authorization_endpoint}?{query}"

    async def exchange_store_and_identify(
        self,
        connection_id: str,
        redirect_uri: str,
        authorization_code: str,
        code_verifier: str,
    ) -> SanitizedChannelConnection:
        response = await self._request(
            "POST",
            self._config.token_endpoint,
            data={
                "client_id": self._config.client_id,
                "client_secret": self._config.client_secret.get_secret_value(),
                "grant_type": "authorization_code",
                "code": authorization_code,
                "code_verifier": code_verifier,
                "redirect_uri": redirect_uri,
            },
        )
        token = self._parse_token_response(response)
        self._validate_required_scopes(token)
        if token.refresh_token is None:
            raise GoogleOAuthError("Google token response did not include a refresh token")
        await self._vault.replace_refresh_token(connection_id, token.refresh_token)
        self._store_access_token(connection_id, token)
        return await self._identify_channel(connection_id, token)

    async def refresh_and_check(
        self, connection_id: str
    ) -> SanitizedChannelConnection:
        refresh_token = await self._vault.read_refresh_token(connection_id)
        response = await self._request(
            "POST",
            self._config.token_endpoint,
            data={
                "client_id": self._config.client_id,
                "client_secret": self._config.client_secret.get_secret_value(),
                "grant_type": "refresh_token",
                "refresh_token": refresh_token.get_secret_value(),
            },
        )
        token = self._parse_token_response(response)
        self._validate_required_scopes(token)
        self._store_access_token(connection_id, token)
        return await self._identify_channel(connection_id, token)

    async def revoke(self, connection_id: str) -> bool:
        refresh_token = await self._vault.read_refresh_token(connection_id)
        try:
            response = await self._request(
                "POST",
                self._config.revoke_endpoint,
                data={"token": refresh_token.get_secret_value()},
            )
        except GoogleNetworkError:
            return False
        return 200 <= response.status_code < 300

    async def _identify_channel(
        self, connection_id: str, token: GoogleTokenClientDto
    ) -> SanitizedChannelConnection:
        access = self._access_tokens[connection_id]
        response = await self._request(
            "GET",
            _join_url(self._config.youtube_api_base_url, "v3/channels"),
            params={"part": "snippet", "mine": "true"},
            headers={
                "Authorization": f"Bearer {access.token.get_secret_value()}",
            },
        )
        if response.status_code == 403:
            raise GoogleWorkspacePolicyError("Google Workspace policy denied access")
        if response.status_code >= 400:
            raise GoogleOAuthError("Google channel identification failed")
        channels = GoogleChannelsListClientDto.model_validate(response.json())
        if not channels.items:
            raise ConnectedChannelNotFoundError("Google account has no YouTube channel")
        return to_sanitized_channel_connection(
            connection_id=connection_id,
            token=token,
            channel=channels.items[0],
            issued_at=self._now(),
        )

    def _parse_token_response(self, response: httpx.Response) -> GoogleTokenClientDto:
        if response.status_code >= 400:
            self._raise_provider_error(response)
        token = GoogleTokenClientDto.model_validate(response.json())
        if token.token_type.lower() != "bearer":
            raise GoogleOAuthError("Google token response did not use bearer tokens")
        return token

    def _validate_required_scopes(self, token: GoogleTokenClientDto) -> None:
        granted = set(token.scope.split())
        required = set(REQUIRED_YOUTUBE_SCOPES)
        if granted != required:
            raise MissingOAuthScopeError("Google response omitted required YouTube scopes")

    def _store_access_token(
        self, connection_id: str, token: GoogleTokenClientDto
    ) -> None:
        self._access_tokens[connection_id] = InMemoryAccessToken(
            token=token.access_token,
            expires_at_monotonic=time.monotonic() + token.expires_in,
        )

    async def _request(
        self,
        method: str,
        url: str,
        **kwargs: Any,
    ) -> httpx.Response:
        try:
            response = await self._http.request(
                method,
                url,
                timeout=httpx.Timeout(10.0),
                **kwargs,
            )
        except httpx.TimeoutException as error:
            raise GoogleNetworkError("Google request timed out") from error
        except httpx.TransportError as error:
            raise GoogleNetworkError("Google request failed") from error
        self._logger.info(
            "google_http",
            extra=redact_google_event(
                {
                    "method": method,
                    "url": url,
                    "status": response.status_code,
                }
            ),
        )
        return response

    def _raise_provider_error(self, response: httpx.Response) -> None:
        reason = _google_error_reason(response)
        if reason == "invalid_grant":
            raise ReauthRequiredError("Google authorization must be renewed")
        if reason == "access_denied":
            raise OAuthConsentDeniedError("Google authorization was denied")
        if reason in {"domainPolicy", "org_internal"}:
            raise GoogleWorkspacePolicyError("Google Workspace policy denied access")
        raise GoogleOAuthError("Google OAuth request failed")


def _google_error_reason(response: httpx.Response) -> str | None:
    try:
        payload = response.json()
    except ValueError:
        return None
    if not isinstance(payload, dict):
        return None
    error = payload.get("error")
    if isinstance(error, str):
        return error
    if not isinstance(error, dict):
        return None
    errors = error.get("errors")
    if isinstance(errors, list):
        for item in errors:
            if isinstance(item, dict) and isinstance(item.get("reason"), str):
                return str(item["reason"])
    reason = error.get("reason")
    if isinstance(reason, str):
        return reason
    return None


def _join_url(base_url: str, path: str) -> str:
    return f"{base_url.rstrip('/')}/{path.lstrip('/')}"
