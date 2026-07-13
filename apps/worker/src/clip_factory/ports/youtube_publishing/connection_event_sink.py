from typing import Protocol

from clip_factory.ports.youtube_publishing.oauth import SanitizedChannelConnection


class ConnectionEventSink(Protocol):
    async def connected(self, connection: SanitizedChannelConnection) -> None: ...

    async def disconnected(self, result: object) -> None: ...
