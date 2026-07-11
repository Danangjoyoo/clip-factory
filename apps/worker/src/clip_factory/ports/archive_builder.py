"""Port for archive creation adapters."""

from dataclasses import dataclass
from typing import Protocol

from clip_factory.ports.source_preprocessor import ObjectReference


@dataclass(frozen=True)
class ArchiveFile:
    name: str
    source: ObjectReference


class ArchiveBuilderPort(Protocol):
    async def build(self, output_key: str, files: tuple[ArchiveFile, ...]) -> ObjectReference: ...
