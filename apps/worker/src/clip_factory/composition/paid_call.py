from typing import Any

from clip_factory.ports.cost_reservation import CostReservation


class LocalPaidCallDependencies:
    """Small local composition for the MVP; replace storage with the API adapter later."""

    def __init__(self) -> None:
        self._artifacts: dict[str, dict[str, object]] = {}
        self._calls: dict[tuple[str, str], dict[str, object]] = {}

    async def reserve(self, request: Any) -> CostReservation:
        return CostReservation(request.call_id, request, "RESERVED")

    async def mark_sent(self, _call_id: str, _request_hash: str) -> None:
        return None

    async def put_json(self, key: str, value: dict[str, object]) -> object:
        self._artifacts[key] = value
        return key

    async def reconcile(self, call_id: str, request_hash: str) -> object | None:
        return self._calls.get((call_id, request_hash))

    async def head_json(self, key: str) -> bool:
        return key in self._artifacts

    async def get_json(self, key: str) -> object:
        return self._artifacts[key]

    async def record_paid_call(self, value: dict[str, object]) -> None:
        self._calls[(str(value["callId"]), str(value["requestHash"]))] = value
