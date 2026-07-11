"""Read-only local source checks. Paths never leave this adapter."""

import hashlib
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Sequence

from clip_factory.domain.source import (
    SourceNotAbsoluteError,
    SourceNotAllowedError,
    SourceUnreadableError,
)

SAMPLE_BYTES = 65_536


@dataclass(frozen=True)
class ValidatedLocalFile:
    display_path: str
    resolved_path: Path
    size_bytes: int
    modified_ns: int
    fingerprint: str


def fingerprint(path: Path, stat: os.stat_result) -> str:
    offsets = (
        0,
        max(0, stat.st_size // 2 - SAMPLE_BYTES // 2),
        max(0, stat.st_size - SAMPLE_BYTES),
    )
    digests: list[str] = []
    with path.open("rb") as source:
        for offset in offsets:
            source.seek(offset)
            digests.append(hashlib.sha256(source.read(SAMPLE_BYTES)).hexdigest())
    material = f"{stat.st_size}:{stat.st_mtime_ns}:{':'.join(digests)}"
    return hashlib.sha256(material.encode("ascii")).hexdigest()


class LocalSourceFilesystem:
    def __init__(self, allowed_roots: Sequence[Path]) -> None:
        self._roots = tuple(
            root.expanduser().resolve(strict=True) for root in allowed_roots
        )

    def validate(self, path: Path) -> ValidatedLocalFile:
        if not path.is_absolute():
            raise SourceNotAbsoluteError("source path must be absolute")
        try:
            resolved = path.expanduser().resolve(strict=True)
        except FileNotFoundError as error:
            raise SourceUnreadableError("source file does not exist") from error
        if not any(resolved.is_relative_to(root) for root in self._roots):
            raise SourceNotAllowedError("resolved path is outside allowed roots")
        stat = resolved.stat()
        if not resolved.is_file() or not os.access(resolved, os.R_OK):
            raise SourceUnreadableError("source must be a readable regular file")
        return ValidatedLocalFile(
            str(path),
            resolved,
            stat.st_size,
            stat.st_mtime_ns,
            fingerprint(resolved, stat),
        )
