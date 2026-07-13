from datetime import datetime, timedelta

from clip_factory.adapters.youtube.client_dto import (
    GoogleChannelClientDto,
    GoogleTokenClientDto,
)
from clip_factory.domain.youtube_publishing.oauth_policy import validate_scopes
from clip_factory.ports.youtube_publishing.oauth import SanitizedChannelConnection


def to_sanitized_channel_connection(
    *,
    connection_id: str,
    token: GoogleTokenClientDto,
    channel: GoogleChannelClientDto,
    issued_at: datetime,
) -> SanitizedChannelConnection:
    return SanitizedChannelConnection(
        connection_id=connection_id,
        channel_id=channel.id,
        channel_title=channel.snippet.title,
        channel_handle=channel.snippet.custom_url,
        avatar_url=_avatar_url(channel),
        granted_scopes=validate_scopes(token.scope.split()),
        oauth_mode="testing"
        if token.refresh_token_expires_in is not None
        else "production",
        refresh_token_expires_at=_refresh_token_expires_at(token, issued_at),
    )


def _avatar_url(channel: GoogleChannelClientDto) -> str | None:
    default = channel.snippet.thumbnails.get("default")
    if default is not None:
        url = default.get("url")
        if isinstance(url, str):
            return url
    for thumbnail in channel.snippet.thumbnails.values():
        url = thumbnail.get("url")
        if isinstance(url, str):
            return url
    return None


def _refresh_token_expires_at(
    token: GoogleTokenClientDto,
    issued_at: datetime,
) -> datetime | None:
    if token.refresh_token_expires_in is None:
        return None
    return issued_at + timedelta(seconds=token.refresh_token_expires_in)
