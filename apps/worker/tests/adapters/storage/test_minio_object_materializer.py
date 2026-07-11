from pathlib import Path

import pytest

from clip_factory.adapters.storage.minio_object_materializer import (
    MinioObjectMaterializer,
    ObjectMaterializationError,
)
from clip_factory.ports.source_preprocessor import ObjectReference


class Store:
    def __init__(self, version: str = "v1") -> None:
        self.version = version

    def download(self, _reference: ObjectReference, destination: Path) -> str:
        destination.write_bytes(b"audio")
        return self.version


def reference() -> ObjectReference:
    import hashlib

    return ObjectReference("bucket", "key", "v1", hashlib.sha256(b"audio").hexdigest())


def test_materializer_verifies_version_hash_and_private_modes(tmp_path: Path) -> None:
    path, workspace = MinioObjectMaterializer(Store(), tmp_path).materialize(reference())
    assert path.read_bytes() == b"audio"
    assert path.stat().st_mode & 0o777 == 0o600
    assert workspace.stat().st_mode & 0o777 == 0o700
    path.unlink()
    workspace.rmdir()


def test_materializer_rejects_version_mismatch(tmp_path: Path) -> None:
    with pytest.raises(ObjectMaterializationError, match="OBJECT_VERSION_MISMATCH"):
        MinioObjectMaterializer(Store("v2"), tmp_path).materialize(reference())
    assert list(tmp_path.iterdir()) == []
