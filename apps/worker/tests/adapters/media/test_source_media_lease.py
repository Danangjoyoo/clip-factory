import asyncio
from pathlib import Path

from clip_factory.adapters.filesystem.local_source import LocalSourceFilesystem
from clip_factory.adapters.http.source_locator_client_models import LocalFileLocator
from clip_factory.adapters.media.source_media_lease import SourceMediaLease


class UnusedMaterializer:
    def materialize(self, _reference: object) -> tuple[Path, Path]:
        raise AssertionError("local source must not materialize")


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
