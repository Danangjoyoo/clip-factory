from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class CostReservationRequest:
    project_id: str
    analysis_run_id: str
    call_id: str
    request_hash: str
    worst_case_microusd: int
    idempotency_key: str


@dataclass(frozen=True)
class CostReservation:
    reservation_id: str
    request: CostReservationRequest
    status: str = "RESERVED"


class CostReservationPort(Protocol):
    async def reserve(self, request: CostReservationRequest) -> CostReservation: ...
