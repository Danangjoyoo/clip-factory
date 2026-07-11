import json
from pathlib import Path

from clip_factory.domain.cost import required_reserve_microusd


def test_shared_vectors_reserve_values() -> None:
    vectors = json.loads(
        (
            Path(__file__).parents[4]
            / "packages/contracts/test-fixtures/cost-conformance-vectors.json"
        ).read_text()
    )
    for vector in vectors:
        if "remainingCallCosts" in vector:
            assert required_reserve_microusd(
                [int(value) for value in vector["remainingCallCosts"]]
            ) == int(vector["expectedReserveMicrousd"])
