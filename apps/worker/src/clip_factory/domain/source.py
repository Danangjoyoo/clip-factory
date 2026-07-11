"""Source validation value objects and policy errors."""

from dataclasses import dataclass
from typing import Any, Literal

SourceHealth = Literal[
    "LOCATED", "SOURCE_MISSING", "SOURCE_CHANGED", "SOURCE_NOT_ALLOWED"
]


class SourceValidationError(Exception):
    """Base error that is safe to expose without a local path."""


class SourceNotAllowedError(SourceValidationError):
    pass


class SourceMissingError(SourceValidationError):
    pass


class SourceChangedError(SourceValidationError):
    pass


class SourceUnreadableError(SourceValidationError):
    pass


class SourceNotAbsoluteError(SourceValidationError):
    pass


@dataclass(frozen=True)
class SourceProbe:
    duration_ms: int | None = None
    width: int | None = None
    height: int | None = None
    has_audio: bool | None = None
    codec_family: str | None = None


@dataclass(frozen=True)
class SourceValidationReceipt:
    source_asset_id: str
    health: SourceHealth
    fingerprint: str
    probe: dict[str, Any] | None = None
