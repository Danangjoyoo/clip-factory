from pathlib import Path

from clip_factory.adapters.filesystem.local_source import LocalSourceFilesystem
from clip_factory.adapters.source.local_source_validation_gateway import (
    LocalSourceValidationGateway,
)
from clip_factory.adapters.http.source_locator_client_models import LocalFileLocator


class Client:
    def __init__(self, path: str, nested_probe: bool = False):
        self.path, self.update, self.nested_probe = path, None, nested_probe

    def get(self, _id: str):
        return LocalFileLocator("LOCAL_FILE", self.path)

    def apply_locator_validation(self, update):
        self.update = update
        if self.nested_probe:
            return {"probe": {"metadata": {"resolvedPath": "/Users/me/a.mov", "durationMs": 1}}}
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


def test_gateway_removes_nested_path_fields(tmp_path: Path) -> None:
    path = tmp_path / "a.mov"
    path.write_bytes(b"a")
    client = Client(str(path), nested_probe=True)
    receipt = LocalSourceValidationGateway(
        client, LocalSourceFilesystem((tmp_path,))
    ).validate_and_persist("id")
    assert receipt.probe == {"metadata": {"durationMs": 1}}
