from datetime import timedelta
from typing import Protocol

from clip_factory.ports.youtube_publishing.oauth import SanitizedChannelConnection


class OAuthCompletionReceiptStore(Protocol):
    async def get_connected(
        self,
        connection_id: str,
    ) -> SanitizedChannelConnection | None: ...

    async def put_connected(
        self,
        connection: SanitizedChannelConnection,
        ttl: timedelta,
    ) -> None: ...
