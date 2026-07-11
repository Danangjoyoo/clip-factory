from pathlib import Path

import pytest

from clip_factory.adapters.filesystem.local_source import LocalSourceFilesystem
from clip_factory.domain.source import (
    SourceNotAbsoluteError,
    SourceNotAllowedError,
    SourceUnreadableError,
)


def test_rejects_relative_and_outside_paths(tmp_path: Path) -> None:
    allowed = tmp_path / "allowed"
    allowed.mkdir()
    source = allowed / "ok.mov"
    source.write_bytes(b"ok")
    adapter = LocalSourceFilesystem((allowed,))
    with pytest.raises(SourceNotAbsoluteError):
        adapter.validate(Path("ok.mov"))
    outside = tmp_path / "outside.mov"
    outside.write_bytes(b"x")
    with pytest.raises(SourceNotAllowedError):
        adapter.validate(outside)


def test_rejects_missing_and_directory(tmp_path: Path) -> None:
    adapter = LocalSourceFilesystem((tmp_path,))
    with pytest.raises(SourceUnreadableError):
        adapter.validate(tmp_path / "missing.mov")
    directory = tmp_path / "dir"
    directory.mkdir()
    with pytest.raises(SourceUnreadableError):
        adapter.validate(directory)


def test_rejects_symlink_escape(tmp_path: Path) -> None:
    allowed = tmp_path / "allowed"
    allowed.mkdir()
    outside = tmp_path / "outside.mov"
    outside.write_bytes(b"x")
    link = allowed / "escape.mov"
    link.symlink_to(outside)
    with pytest.raises(SourceNotAllowedError, match="outside allowed roots"):
        LocalSourceFilesystem((allowed,)).validate(link)
