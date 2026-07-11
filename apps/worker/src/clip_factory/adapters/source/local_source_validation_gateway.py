from pathlib import Path
from typing import Any, cast

from clip_factory.adapters.filesystem.local_source import LocalSourceFilesystem
from clip_factory.adapters.http.source_locator_client import modified_at
from clip_factory.adapters.http.source_locator_client_models import (
    SourceLocatorClient,
    SourceValidationUpdate,
)
from clip_factory.domain.source import SourceValidationReceipt


def _without_paths(value: object) -> object:
    if isinstance(value, dict):
        return {
            key: _without_paths(child)
            for key, child in value.items()
            if "path" not in key.lower()
        }
    if isinstance(value, list):
        return [_without_paths(child) for child in value]
    return value


class LocalSourceValidationGateway:
    def __init__(
        self, client: SourceLocatorClient, filesystem: LocalSourceFilesystem
    ) -> None:
        self._client = client
        self._filesystem = filesystem

    def validate_and_persist(self, source_asset_id: str) -> SourceValidationReceipt:
        locator = self._client.get(source_asset_id)
        validated = self._filesystem.validate(Path(locator.candidate_path))
        result = self._client.apply_locator_validation(
            SourceValidationUpdate(
                source_asset_id,
                str(validated.resolved_path),
                validated.size_bytes,
                modified_at(validated.modified_ns),
                validated.fingerprint,
            )
        )
        probe = result.get("probe")
        safe_probe = (
            cast(dict[str, Any], _without_paths(probe))
            if isinstance(probe, (dict, list))
            else None
        )
        return SourceValidationReceipt(
            source_asset_id, "LOCATED", validated.fingerprint, safe_probe
        )
