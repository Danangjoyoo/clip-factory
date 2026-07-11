import hashlib
import json
from pathlib import Path
from typing import Any
from clip_factory.ports.source_preprocessor import ObjectReference


class MinioArtifactStore:
    def __init__(self, root: Path, bucket: str = "clip-factory") -> None:
        self.root, self.bucket = root, bucket

    async def put_json(self, key: str, value: dict[str, Any]) -> ObjectReference:
        path = self.root / self.bucket / key
        path.parent.mkdir(parents=True, exist_ok=True)
        raw = json.dumps(value, sort_keys=True, separators=(",", ":")).encode()
        path.write_bytes(raw)
        return ObjectReference(self.bucket, key, "v1", hashlib.sha256(raw).hexdigest())

    def download(self, reference: ObjectReference, destination: Path) -> str:
        destination.write_bytes(
            (self.root / reference.bucket / reference.key).read_bytes()
        )
        return reference.version_id
