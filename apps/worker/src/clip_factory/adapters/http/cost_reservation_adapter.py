from uuid import uuid4
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
            return response
        if isinstance(response, dict) and response.get("error"):
            raise ReservationConflictError(response["error"])
        return CostReservation(str(response.get("reservationId", uuid4())), request)
