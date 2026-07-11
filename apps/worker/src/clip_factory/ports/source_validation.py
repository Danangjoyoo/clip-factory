from typing import Protocol

from clip_factory.domain.source import SourceValidationReceipt


class SourceValidationPort(Protocol):
    def validate_and_persist(self, source_asset_id: str) -> SourceValidationReceipt: ...
