import asyncio
from pathlib import Path

import pytest

from clip_factory.adapters.filesystem.local_source import LocalSourceFilesystem
from clip_factory.adapters.http.source_locator_client_models import LocalFileLocator
from clip_factory.adapters.media.source_media_lease import SourceMediaLease


class NoMaterializer:
    def materialize(self, reference):
        raise AssertionError(reference)


def test_local_snapshot_mismatch_is_rejected(tmp_path: Path) -> None:
    source = tmp_path / "source.mp4"
    source.write_bytes(b"changed")

    async def run() -> None:
        lease = SourceMediaLease(
            LocalFileLocator("LOCAL_FILE", str(source), fingerprint="old"),
            LocalSourceFilesystem((tmp_path,)),
            NoMaterializer(),
        )
        with pytest.raises(RuntimeError, match="SOURCE_CHANGED"):
            async with lease:
                pass

    asyncio.run(run())
