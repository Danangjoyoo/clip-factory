from typing import Any, Protocol
from clip_factory.ports.source_preprocessor import ObjectReference


class ArtifactStorePort(Protocol):
    async def put_json(self, key: str, value: dict[str, Any]) -> ObjectReference: ...

    def put_file(self, path: Any, key: str, content_type: str = "application/octet-stream") -> ObjectReference: ...
