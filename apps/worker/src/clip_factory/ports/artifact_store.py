from pathlib import Path
from typing import Any, Protocol
from clip_factory.ports.source_preprocessor import ObjectReference


class ArtifactStorePort(Protocol):
    async def put_json(self, key: str, value: dict[str, Any]) -> ObjectReference: ...

    async def put_file(self, key: str, path: Path) -> ObjectReference: ...
