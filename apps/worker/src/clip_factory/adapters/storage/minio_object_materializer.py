"""Materialize an immutable object into a private activity directory."""

import hashlib
import tempfile
from pathlib import Path
from typing import Protocol

from clip_factory.ports.source_preprocessor import ObjectReference


class ObjectDownloader(Protocol):
    def download(self, reference: ObjectReference, destination: Path) -> object: ...


class ObjectMaterializationError(RuntimeError):
    pass


class MinioObjectMaterializer:
    def __init__(self, store: ObjectDownloader, temp_root: Path | None = None) -> None:
        self._store = store
        self._temp_root = temp_root

    def materialize(self, reference: ObjectReference) -> tuple[Path, Path]:
        workspace = Path(tempfile.mkdtemp(prefix="clip-factory-", dir=self._temp_root))
        workspace.chmod(0o700)
        destination = workspace / "source.bin"
        try:
            result = self._store.download(reference, destination)
            destination.chmod(0o600)
            version_id = _version_id(result)
            if version_id is None and hasattr(self._store, "head"):
                version_id = _version_id(self._store.head(reference))
            if version_id is not None and version_id != reference.version_id:
                raise ObjectMaterializationError("OBJECT_VERSION_MISMATCH")
            digest = hashlib.sha256(destination.read_bytes()).hexdigest()
            if digest != reference.sha256:
                raise ObjectMaterializationError("OBJECT_HASH_MISMATCH")
            return destination, workspace
        except Exception:
            _remove(workspace)
            raise


def _remove(path: Path) -> None:
    if path.exists():
        for child in path.iterdir():
            child.unlink()
        path.rmdir()


def _version_id(value: object) -> str | None:
    if isinstance(value, str):
        return value
    if value is None:
        return None
    version = getattr(value, "version_id", getattr(value, "versionId", None))
    return str(version) if version else None
