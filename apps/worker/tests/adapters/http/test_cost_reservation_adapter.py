import asyncio

from clip_factory.adapters.http.cost_reservation_adapter import (
    HttpCostReservationAdapter,
    ReservationConflictError,
)
from clip_factory.ports.cost_reservation import CostReservationRequest


def test_conflict_is_typed() -> None:
    async def call(_request):
        return {"error": "RESERVATION_OWNERSHIP_CONFLICT"}

    async def run() -> None:
        adapter = HttpCostReservationAdapter(call)
        request = CostReservationRequest("p", "r", "c", "h", 10, "i")
        try:
            await adapter.reserve(request)
        except ReservationConflictError as exc:
            assert exc.code == "RESERVATION_OWNERSHIP_CONFLICT"
        else:
            raise AssertionError("expected conflict")

    asyncio.run(run())
