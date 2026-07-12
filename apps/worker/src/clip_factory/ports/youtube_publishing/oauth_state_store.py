from datetime import datetime
from typing import Protocol


class OAuthStateStore(Protocol):
    async def put(self, state_digest: str, connection_id: str, expires_at: datetime) -> None: ...

    async def consume(self, state_digest: str, now: datetime) -> str | None: ...
