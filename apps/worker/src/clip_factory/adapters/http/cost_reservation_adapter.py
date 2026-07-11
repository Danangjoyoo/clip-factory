from uuid import UUID
from collections.abc import Awaitable, Callable
from typing import Any

from clip_factory.ports.cost_reservation import CostReservation, CostReservationRequest


class ReservationConflictError(RuntimeError):
    def __init__(self, code: str) -> None:
        super().__init__(code)
        self.code = code


class HttpCostReservationAdapter:
    """Transport boundary; the Next.js endpoint supplies atomic persistence."""

    def __init__(
        self, reserve_call: Callable[[CostReservationRequest], Awaitable[Any]]
    ) -> None:
        self._reserve_call = reserve_call

    async def reserve(self, request: CostReservationRequest) -> CostReservation:
        if request.worst_case_microusd < 0:
            raise ValueError("worst-case cost must be nonnegative")
        response = await self._reserve_call(request)
        if isinstance(response, CostReservation):
            if response.request != request or not _valid_id(response.reservation_id):
                raise ReservationConflictError("PAID_CALL_CONFLICT")
            return response
        if isinstance(response, dict) and response.get("error"):
            raise ReservationConflictError(response["error"])
        if not isinstance(response, dict) or not _valid_id(response.get("reservationId")):
            raise ReservationConflictError("INVALID_RESERVATION_RESPONSE")
        fields = {
            "projectId": request.project_id,
            "analysisRunId": request.analysis_run_id,
            "callId": request.call_id,
            "requestHash": request.request_hash,
            "worstCaseMicrousd": request.worst_case_microusd,
        }
        if any(response.get(key) != value for key, value in fields.items()):
            raise ReservationConflictError("RESERVATION_OWNERSHIP_CONFLICT")
        return CostReservation(response["reservationId"], request, str(response.get("status", "RESERVED")))


def _valid_id(value: object) -> bool:
    if not isinstance(value, str):
        return False
    try:
        UUID(value)
    except ValueError:
        return False
    return True
