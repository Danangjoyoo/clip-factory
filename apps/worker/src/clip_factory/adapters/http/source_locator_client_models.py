from dataclasses import dataclass
from typing import Any, Literal, Protocol


@dataclass(frozen=True)
class LocalFileLocator:
    kind: Literal["LOCAL_FILE"]
    candidate_path: str
    fingerprint: str | None = None
    size_bytes: int | None = None
    modified_ns: int | None = None


@dataclass(frozen=True)
class SourceValidationUpdate:
    source_asset_id: str
    resolved_path: str
    size_bytes: int
    modified_at: str
    fingerprint: str
    probe: dict[str, Any] | None = None


class SourceLocatorClient(Protocol):
    def get(self, source_asset_id: str) -> LocalFileLocator: ...

    def apply_locator_validation(
        self, update: SourceValidationUpdate
    ) -> dict[str, Any]: ...
