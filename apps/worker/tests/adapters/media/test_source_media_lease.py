import asyncio
import hashlib
from pathlib import Path
from typing import cast

from clip_factory.adapters.filesystem.local_source import LocalSourceFilesystem
from clip_factory.adapters.http.source_locator_client_models import LocalFileLocator
from clip_factory.adapters.media.source_media_lease import SourceMediaLease
from clip_factory.adapters.storage.minio_object_materializer import (
    MinioObjectMaterializer,
)
from clip_factory.ports.source_preprocessor import ObjectReference


class UnusedMaterializer:
    def materialize(self, _reference: object) -> tuple[Path, Path]:
        raise AssertionError("local source must not materialize")


class ObjectStore:
    def __init__(self, version: str = "v1") -> None:
        self.version = version

    def download(self, _reference: ObjectReference, destination: Path) -> str:
        destination.write_bytes(b"source")
        return self.version


def object_reference() -> ObjectReference:
    return ObjectReference(
        "bucket", "source.mov", "v1", hashlib.sha256(b"source").hexdigest()
    )


def test_local_lease_keeps_source_and_cleans_private_workspace(tmp_path: Path) -> None:
    source = tmp_path / "source.mov"
    source.write_bytes(b"source")

    async def run() -> None:
        lease = SourceMediaLease(
            LocalFileLocator("LOCAL_FILE", str(source)),
            LocalSourceFilesystem((tmp_path,)),
            UnusedMaterializer(),  # type: ignore[arg-type]
        )
        async with lease as path:
            assert path == source
            workspace = lease.workspace
            (workspace / "speech.wav").write_bytes(b"audio")
            assert source.exists()
        assert not workspace.exists()
        assert source.read_bytes() == b"source"

    asyncio.run(run())


def test_lease_cleans_workspace_on_exception(tmp_path: Path) -> None:
    source = tmp_path / "source.mov"
    source.write_bytes(b"source")

    async def run() -> None:
        lease = SourceMediaLease(
            LocalFileLocator("LOCAL_FILE", str(source)),
            LocalSourceFilesystem((tmp_path,)),
            cast(MinioObjectMaterializer, UnusedMaterializer()),
        )
        try:
            async with lease:
                workspace = lease.workspace
                raise RuntimeError("stop")
        except RuntimeError:
            pass
        assert not workspace.exists()

    asyncio.run(run())


def test_materialized_lease_cleans_workspace_on_success(tmp_path: Path) -> None:
    async def run() -> None:
        lease = SourceMediaLease(
            object_reference(),
            LocalSourceFilesystem((tmp_path,)),
            MinioObjectMaterializer(ObjectStore(), tmp_path),
        )
        async with lease as path:
            workspace = lease.workspace
            assert path.read_bytes() == b"source"
            assert workspace.exists()
        assert not workspace.exists()

    asyncio.run(run())


def test_materialized_lease_cleans_workspace_on_exception(tmp_path: Path) -> None:
    async def run() -> None:
        lease = SourceMediaLease(
            object_reference(),
            LocalSourceFilesystem((tmp_path,)),
            MinioObjectMaterializer(ObjectStore(), tmp_path),
        )
        try:
            async with lease:
                workspace = lease.workspace
                raise RuntimeError("stop")
        except RuntimeError:
            pass
        assert not workspace.exists()

    asyncio.run(run())


def test_materialized_lease_cleans_workspace_on_cancellation(tmp_path: Path) -> None:
    async def run() -> None:
        lease = SourceMediaLease(
            object_reference(),
            LocalSourceFilesystem((tmp_path,)),
            MinioObjectMaterializer(ObjectStore(), tmp_path),
        )
        try:
            async with lease:
                workspace = lease.workspace
                raise asyncio.CancelledError
        except asyncio.CancelledError:
            pass
        assert not workspace.exists()

    asyncio.run(run())


def test_lease_cleans_workspace_on_cancellation(tmp_path: Path) -> None:
    source = tmp_path / "source.mov"
    source.write_bytes(b"source")

    async def run() -> None:
        lease = SourceMediaLease(
            LocalFileLocator("LOCAL_FILE", str(source)),
            LocalSourceFilesystem((tmp_path,)),
            cast(MinioObjectMaterializer, UnusedMaterializer()),
        )
        try:
            async with lease:
                workspace = lease.workspace
                (workspace / "speech.wav").write_bytes(b"audio")
                raise asyncio.CancelledError
        except asyncio.CancelledError:
            pass
        assert not workspace.exists()
        assert source.read_bytes() == b"source"

    asyncio.run(run())
