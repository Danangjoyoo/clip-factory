from clip_factory.adapters.filesystem.local_source import LocalSourceFilesystem
from clip_factory.adapters.http.source_locator_client import modified_at
from clip_factory.adapters.http.source_locator_client_models import (
    SourceLocatorClient,
    SourceValidationUpdate,
)
from clip_factory.domain.source import SourceValidationReceipt


class LocalSourceValidationGateway:
    def __init__(
        self, client: SourceLocatorClient, filesystem: LocalSourceFilesystem
    ) -> None:
        self._client = client
        self._filesystem = filesystem

    def validate_and_persist(self, source_asset_id: str) -> SourceValidationReceipt:
        locator = self._client.get(source_asset_id)
        validated = self._filesystem.validate(
            __import__("pathlib").Path(locator.candidate_path)
        )
        result = self._client.apply_locator_validation(
            SourceValidationUpdate(
                source_asset_id,
                str(validated.resolved_path),
                validated.size_bytes,
                modified_at(validated.modified_ns),
                validated.fingerprint,
            )
        )
        return SourceValidationReceipt(
            source_asset_id, "LOCATED", validated.fingerprint, result.get("probe")
        )
