import shutil
import tempfile
from pathlib import Path
from typing import Any

from clip_factory.adapters.filesystem.local_source import LocalSourceFilesystem
from clip_factory.adapters.storage.minio_object_materializer import (
    MinioObjectMaterializer,
)


class SourceMediaLease:
    """Yields a source path and always cleans only materialized private paths."""

    def __init__(
        self,
        locator: Any,
        local_filesystem: LocalSourceFilesystem,
        materializer: MinioObjectMaterializer,
    ) -> None:
        self._locator = locator
        self._local_filesystem = local_filesystem
        self._materializer = materializer
        self._workspace: Path | None = None
        self.path: Path | None = None

    async def __aenter__(self) -> Path:
        if hasattr(self._locator, "candidate_path"):
            validated = self._local_filesystem.validate(
                Path(self._locator.candidate_path)
            )
            self.path = validated.resolved_path
            self._workspace = Path(tempfile.mkdtemp(prefix="clip-factory-"))
            self._workspace.chmod(0o700)
            return self.path
        self.path, self._workspace = self._materializer.materialize(self._locator)
        return self.path

    async def __aexit__(self, *_: object) -> None:
        if self._workspace and self._workspace.exists():
            shutil.rmtree(self._workspace, ignore_errors=True)
        self.path = None

    @property
    def workspace(self) -> Path:
        if self._workspace is None:
            raise RuntimeError("source lease is not active")
        return self._workspace
