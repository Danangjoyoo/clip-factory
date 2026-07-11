from dataclasses import dataclass
from enum import StrEnum
from typing import Protocol


class ModelAccessStatus(StrEnum):
    AVAILABLE = "AVAILABLE"
    NOT_ENTITLED = "NOT_ENTITLED"
    NOT_FOUND = "NOT_FOUND"
    CHECK_UNAVAILABLE = "CHECK_UNAVAILABLE"


@dataclass(frozen=True)
class ModelAccessResult:
    model_id: str
    status: ModelAccessStatus
    presentation: str = ""


class ModelAccessPort(Protocol):
    async def check(self, model_id: str) -> ModelAccessResult: ...
