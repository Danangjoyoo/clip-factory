from collections.abc import Sequence
from typing import Protocol

from clip_factory.domain.reframe import SubjectObservation
from clip_factory.ports.proxy_frames import ProxyFrame


class SubjectDetectorPort(Protocol):
    async def detect(self, frame: ProxyFrame) -> Sequence[SubjectObservation]: ...
