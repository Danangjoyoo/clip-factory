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


def test_malformed_success_is_rejected() -> None:
    async def run() -> None:
        request = CostReservationRequest("p", "r", "c", "h", 10, "i")
        adapter = HttpCostReservationAdapter(lambda _request: _missing_id())
        try:
            await adapter.reserve(request)
        except ReservationConflictError as exc:
            assert exc.code == "INVALID_RESERVATION_RESPONSE"
        else:
            raise AssertionError("expected malformed response")

    asyncio.run(run())


async def _missing_id() -> dict[str, object]:
    return {"projectId": "p"}
