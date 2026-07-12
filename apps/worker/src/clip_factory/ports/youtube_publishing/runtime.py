from datetime import datetime
from typing import Protocol


class Clock(Protocol):
    def now(self) -> datetime: ...


class EntropySource(Protocol):
    def bytes(self, size: int) -> bytes: ...


class LoopbackListener(Protocol):
    async def bind(self) -> str: ...
