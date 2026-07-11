"""Build zip archives from object references."""

from __future__ import annotations

import tempfile
import zipfile
from collections.abc import Callable
from pathlib import Path
from typing import Protocol

from clip_factory.ports.archive_builder import ArchiveFile
from clip_factory.ports.source_preprocessor import ObjectReference


class ArtifactStore(Protocol):
    async def put_file(self, key: str, path: Path) -> ObjectReference: ...


ObjectDownloader = Callable[[ObjectReference, Path], object]


class ZipArchiveBuilder:
    def __init__(
        self,
        downloader: ObjectDownloader,
        artifact_store: ArtifactStore,
    ) -> None:
        self._downloader = downloader
        self._store = artifact_store

    async def build(
        self,
        output_key: str,
        files: tuple[ArchiveFile, ...],
    ) -> ObjectReference:
        with tempfile.TemporaryDirectory(prefix="clip-factory-") as root:
            root_path = Path(root)
            zip_path = root_path / "archive.zip"
            with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as archive:
                for item in files:
                    if _is_unsafe_name(item.name):
                        raise ValueError("INVALID_ARCHIVE_ENTRY")
                    source_path = root_path / item.name
                    self._downloader(item.source, source_path)
                    archive.write(source_path, item.name)
            return await self._store.put_file(output_key, zip_path)


def _is_unsafe_name(value: str) -> bool:
    return (
        value.startswith(("/", "\\"))
        or ".." in value.split("/")[0].split("\\")[0]
        or (".." in value)
        or ("/" in value or "\\" in value)
    )
