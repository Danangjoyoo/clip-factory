import asyncio
import zipfile
from pathlib import Path

import pytest

from clip_factory.adapters.archive.zip_archive_builder import ZipArchiveBuilder
from clip_factory.ports.archive_builder import ArchiveFile
from clip_factory.ports.source_preprocessor import ObjectReference


class FakeDownloader:
    def __init__(self, payloads: dict[str, bytes]) -> None:
        self.payloads = payloads

    def __call__(self, reference: ObjectReference, destination: Path) -> None:
        destination.write_bytes(self.payloads[reference.key])


class FakeStore:
    def __init__(self, root: Path) -> None:
        self.root = root

    async def put_file(self, key: str, path: Path) -> ObjectReference:
        target = self.root / key
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(path.read_bytes())
        return ObjectReference("clip-factory", key, "v1", "hash")


def test_zip_archive_builder_writes_sorted_member_names(tmp_path: Path) -> None:
    downloader = FakeDownloader(
        {
            "video-1": b"video-1-bytes",
            "subtitle-1": b"subtitle-1-bytes",
            "video-2": b"video-2-bytes",
        }
    )
    store = FakeStore(tmp_path)
    builder = ZipArchiveBuilder(downloader, store)

    builder_output = asyncio.run(
        builder.build(
            "archives/out.zip",
            (
                ArchiveFile("002-second.mp4", ObjectReference("bucket", "video-2", "v1", "x" * 64)),
                ArchiveFile("001-first.mp4", ObjectReference("bucket", "video-1", "v1", "x" * 64)),
                ArchiveFile("001-first.srt", ObjectReference("bucket", "subtitle-1", "v1", "x" * 64)),
            ),
        )
    )
    assert builder_output.key == "archives/out.zip"
    with zipfile.ZipFile(tmp_path / "archives" / "out.zip") as archive:
        names = archive.namelist()
        assert names == ["002-second.mp4", "001-first.mp4", "001-first.srt"]
        assert archive.read("001-first.mp4") == b"video-1-bytes"
        assert archive.read("001-first.srt") == b"subtitle-1-bytes"
        assert archive.read("002-second.mp4") == b"video-2-bytes"


def test_zip_archive_builder_rejects_path_traversal(tmp_path: Path) -> None:
    builder = ZipArchiveBuilder(FakeDownloader({"bad": b"x"}), FakeStore(tmp_path))
    with pytest.raises(ValueError, match="INVALID_ARCHIVE_ENTRY"):
        asyncio.run(
            builder.build(
                "archives/out.zip",
                (ArchiveFile("../first.mp4", ObjectReference("bucket", "bad", "v1", "x" * 64)),),
            )
        )
