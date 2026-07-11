"""Build zip archives of successful render outputs."""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass

from clip_factory.ports.archive_builder import ArchiveBuilderPort, ArchiveFile
from clip_factory.ports.source_preprocessor import ObjectReference


@dataclass(frozen=True)
class ArchiveRenderInput:
    clip_id: str
    title: str
    sort_order: int
    video: ObjectReference
    srt: ObjectReference | None = None


@dataclass(frozen=True)
class BuildArchiveCommand:
    project_id: str
    archive_id: str
    renders: tuple[ArchiveRenderInput, ...]


@dataclass(frozen=True)
class BuildArchiveResult:
    output_key: str


class BuildArchive:
    def __init__(self, builder: ArchiveBuilderPort) -> None:
        self._builder = builder

    async def execute(self, input: BuildArchiveCommand) -> BuildArchiveResult:
        sorted_renders = sorted(input.renders, key=lambda item: item.sort_order)
        if not sorted_renders:
            raise ValueError("NO_SUCCESSFUL_RENDERS")
        files: list[ArchiveFile] = []
        for index, item in enumerate(sorted_renders, start=1):
            base_name = _safe_name(item.title, 80)
            files.append(ArchiveFile(f"{index:03d}-{base_name}.mp4", item.video))
            if item.srt is not None:
                files.append(ArchiveFile(f"{index:03d}-{base_name}.srt", item.srt))
        output_key = f"projects/{input.project_id}/archives/{input.archive_id}.zip"
        reference = await self._builder.build(
            output_key, tuple(files)
        )
        return BuildArchiveResult(reference.key)


def _safe_name(value: str, limit: int) -> str:
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    safe = re.sub(r"[^a-zA-Z0-9]+", "-", normalized).strip("-").lower()
    safe = re.sub(r"-{2,}", "-", safe)
    return (safe[:limit] or "clip")
