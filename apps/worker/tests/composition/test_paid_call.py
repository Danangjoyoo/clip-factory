import asyncio

from clip_factory.composition.paid_call import LocalPaidCallDependencies
from clip_factory.ports.cost_reservation import CostReservationRequest


def test_local_paid_state_survives_reopen(tmp_path) -> None:
    async def run() -> None:
        request = CostReservationRequest("p", "a", "c", "hash", 10, "c")
        first = LocalPaidCallDependencies(tmp_path / "paid.sqlite")
        await first.reserve(request)
        await first.mark_sent("c", "hash")
        await first.put_json("calls/c.json", {"callId": "c", "requestHash": "hash"})
        await first.record_paid_call({"callId": "c", "requestHash": "hash"})
        second = LocalPaidCallDependencies(tmp_path / "paid.sqlite")
        assert await second.reconcile("c", "hash") == {
            "callId": "c",
            "requestHash": "hash",
        }
        assert await second.head_json("calls/c.json")

    asyncio.run(run())
