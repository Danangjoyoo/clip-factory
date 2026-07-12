from dataclasses import dataclass
from datetime import datetime
from typing import Protocol


@dataclass(frozen=True, slots=True)
class AuthorizationRequest:
    authorization_display_url: str
    state_digest: str
    expires_at: datetime


@dataclass(frozen=True, slots=True)
class SanitizedChannelConnection:
    connection_id: str
    channel_id: str
    channel_title: str
    channel_handle: str | None
    avatar_url: str | None
    granted_scopes: tuple[str, ...]
    oauth_mode: str
    refresh_token_expires_at: datetime | None


class YouTubeOAuthGateway(Protocol):
    async def create_authorization_request(
        self, connection_id: str, redirect_uri: str, state: str, code_challenge: str
    ) -> str: ...

    async def exchange_store_and_identify(
        self,
        connection_id: str,
        redirect_uri: str,
        authorization_code: str,
        code_verifier: str,
    ) -> SanitizedChannelConnection: ...

    async def refresh_and_check(
        self, connection_id: str
    ) -> SanitizedChannelConnection: ...

    async def revoke(self, connection_id: str) -> bool: ...
