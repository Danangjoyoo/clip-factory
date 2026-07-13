import asyncio
from uuid import uuid4

from clip_factory.adapters.http.cost_reservation_adapter import (
    HttpCostReservationAdapter,
    ReservationConflictError,
)
from clip_factory.ports.cost_reservation import CostReservation, CostReservationRequest


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


def test_negative_reservation_is_rejected_before_transport() -> None:
    async def run() -> None:
        adapter = HttpCostReservationAdapter(lambda _request: _missing_id())
        request = CostReservationRequest("p", "r", "c", "h", -1, "i")
        try:
            await adapter.reserve(request)
        except ValueError as exc:
            assert str(exc) == "worst-case cost must be nonnegative"
        else:
            raise AssertionError("expected validation error")

    asyncio.run(run())


def test_valid_dictionary_response_returns_reservation() -> None:
    async def run() -> None:
        reservation_id = str(uuid4())
        request = CostReservationRequest("p", "r", str(uuid4()), "h", 10, "i")
        adapter = HttpCostReservationAdapter(
            lambda _request: _response(reservation_id, request)
        )

        reservation = await adapter.reserve(request)

        assert reservation == CostReservation(reservation_id, request, "RESERVED")

    asyncio.run(run())


def test_typed_response_must_match_request() -> None:
    async def run() -> None:
        request = CostReservationRequest("p", "r", str(uuid4()), "h", 10, "i")
        other = CostReservationRequest("p", "r", str(uuid4()), "h", 10, "i")
        adapter = HttpCostReservationAdapter(
            lambda _request: _typed_response(CostReservation(str(uuid4()), other))
        )
        try:
            await adapter.reserve(request)
        except ReservationConflictError as exc:
            assert exc.code == "PAID_CALL_CONFLICT"
        else:
            raise AssertionError("expected conflict")

    asyncio.run(run())


def test_typed_response_with_matching_request_is_returned() -> None:
    async def run() -> None:
        request = CostReservationRequest("p", "r", str(uuid4()), "h", 10, "i")
        expected = CostReservation(str(uuid4()), request)
        adapter = HttpCostReservationAdapter(lambda _request: _typed_response(expected))

        assert await adapter.reserve(request) == expected

    asyncio.run(run())


def test_dictionary_response_must_match_request_identity() -> None:
    async def run() -> None:
        request = CostReservationRequest("p", "r", str(uuid4()), "h", 10, "i")
        response = await _response(str(uuid4()), request)
        response["projectId"] = "other"
        adapter = HttpCostReservationAdapter(lambda _request: _dict_response(response))
        try:
            await adapter.reserve(request)
        except ReservationConflictError as exc:
            assert exc.code == "RESERVATION_OWNERSHIP_CONFLICT"
        else:
            raise AssertionError("expected conflict")

    asyncio.run(run())


def test_invalid_uuid_response_is_rejected() -> None:
    async def run() -> None:
        request = CostReservationRequest("p", "r", str(uuid4()), "h", 10, "i")
        adapter = HttpCostReservationAdapter(
            lambda _request: _dict_response({"reservationId": "not-a-uuid"})
        )
        try:
            await adapter.reserve(request)
        except ReservationConflictError as exc:
            assert exc.code == "INVALID_RESERVATION_RESPONSE"
        else:
            raise AssertionError("expected malformed response")

    asyncio.run(run())


async def _response(
    reservation_id: str, request: CostReservationRequest
) -> dict[str, object]:
    return {
        "reservationId": reservation_id,
        "projectId": request.project_id,
        "analysisRunId": request.analysis_run_id,
        "callId": request.call_id,
        "requestHash": request.request_hash,
        "worstCaseMicrousd": request.worst_case_microusd,
        "status": "RESERVED",
    }


async def _typed_response(reservation: CostReservation) -> CostReservation:
    return reservation


async def _dict_response(response: dict[str, object]) -> dict[str, object]:
    return response
