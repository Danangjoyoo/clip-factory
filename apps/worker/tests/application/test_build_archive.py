import asyncio

import pytest

from clip_factory.application.build_archive import (
    ArchiveRenderInput,
    BuildArchive,
    BuildArchiveCommand,
)
from clip_factory.ports.archive_builder import ArchiveBuilderPort, ArchiveFile
from clip_factory.ports.source_preprocessor import ObjectReference


class FakeArchiveBuilder(ArchiveBuilderPort):
    def __init__(self) -> None:
        self.calls: list[tuple[str, tuple[ArchiveFile, ...]]] = []

    async def build(self, output_key: str, files: tuple[ArchiveFile, ...]) -> ObjectReference:
        self.calls.append((output_key, files))
        return ObjectReference("clip-factory", output_key, "v1", "b" * 64)


def test_build_archive_sorts_and_sanitizes_output_names() -> None:
    builder = FakeArchiveBuilder()
    service = BuildArchive(builder)
    result = asyncio.run(
        service.execute(
            BuildArchiveCommand(
                project_id="project-1",
                archive_id="archive-1",
                renders=(
                    ArchiveRenderInput(
                        clip_id="clip-2",
                        title="Second Clip!!!",
                        sort_order=20,
                        video=ObjectReference("bucket", "second.mp4", "v2", "s" * 64),
                        srt=ObjectReference("bucket", "second.srt", "v2", "t" * 64),
                    ),
                    ArchiveRenderInput(
                        clip_id="clip-1",
                        title="First  Clip  -- Title",
                        sort_order=10,
                        video=ObjectReference("bucket", "first.mp4", "v3", "a" * 64),
                    ),
                ),
            )
        )
    )
    assert result.output_key == "projects/project-1/archives/archive-1.zip"
    output_key, files = builder.calls[0]
    assert output_key == "projects/project-1/archives/archive-1.zip"
    assert [file.name for file in files] == [
        "001-first-clip-title.mp4",
        "002-second-clip.mp4",
        "002-second-clip.srt",
    ]


def test_build_archive_rejects_no_successful_renders() -> None:
    service = BuildArchive(FakeArchiveBuilder())
    with pytest.raises(ValueError, match="NO_SUCCESSFUL_RENDERS"):
        asyncio.run(service.execute(BuildArchiveCommand("project-1", "archive-2", ())))
