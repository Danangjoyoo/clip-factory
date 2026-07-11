from collections.abc import Sequence
from dataclasses import dataclass
from typing import Protocol

from clip_factory.domain.media import MediaProbe


@dataclass(frozen=True)
class ProxyFrame:
    time_ms: int
    width: int
    height: int
    payload: bytes = b""


class ProxyFramePort(Protocol):
    async def frames(self, source: str, probe: MediaProbe, sample_rate_hz: int = 5, width: int = 640) -> Sequence[ProxyFrame]: ...
