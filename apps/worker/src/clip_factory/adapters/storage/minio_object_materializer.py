"""Materialize an immutable object into a private activity directory."""

import hashlib
import tempfile
from pathlib import Path
from typing import Protocol

from clip_factory.ports.source_preprocessor import ObjectReference


class ObjectDownloader(Protocol):
    def download(self, reference: ObjectReference, destination: Path) -> None: ...


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
            self._store.download(reference, destination)
            destination.chmod(0o600)
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
