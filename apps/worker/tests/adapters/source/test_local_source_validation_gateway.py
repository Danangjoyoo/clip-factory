from pathlib import Path

from clip_factory.adapters.filesystem.local_source import LocalSourceFilesystem
from clip_factory.adapters.source.local_source_validation_gateway import (
    LocalSourceValidationGateway,
)
from clip_factory.adapters.http.source_locator_client_models import LocalFileLocator


class Client:
    def __init__(self, path: str):
        self.path, self.update = path, None

    def get(self, _id: str):
        return LocalFileLocator("LOCAL_FILE", self.path)

    def apply_locator_validation(self, update):
        self.update = update
        return {"probe": {"durationMs": 1, "resolvedPath": update.resolved_path}}


def test_gateway_returns_path_free_receipt(tmp_path: Path) -> None:
    path = tmp_path / "a.mov"
    path.write_bytes(b"a")
    client = Client(str(path))
    receipt = LocalSourceValidationGateway(
        client, LocalSourceFilesystem((tmp_path,))
    ).validate_and_persist("id")
    assert "/Users/" not in repr(receipt)
    assert "resolvedPath" not in (receipt.probe or {})
    assert client.update.resolved_path == str(path)
