from clip_factory.domain.source import SourceValidationReceipt
from clip_factory.ports.source_validation import SourceValidationPort


class ValidateLocalSource:
    def __init__(self, gateway: SourceValidationPort) -> None:
        self._gateway = gateway

    def execute(self, source_asset_id: str) -> SourceValidationReceipt:
        return self._gateway.validate_and_persist(source_asset_id)
