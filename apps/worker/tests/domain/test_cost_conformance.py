import json
from pathlib import Path

from clip_factory.domain.cost import required_reserve_microusd


def _price(tokens: dict[str, str], rule: dict[str, object]) -> int:
    total = sum(int(tokens[key]) for key in ("uncachedInput", "cachedInput", "cacheWriteInput"))
    long = total > int(rule["longContextThresholdTokens"])
    input_multiplier = rule["longContextInputMultiplier"] if long else {"numerator": 1, "denominator": 1}
    output_multiplier = rule["longContextOutputMultiplier"] if long else {"numerator": 1, "denominator": 1}
    def part(count: str, rate: object, multiplier: dict[str, int]) -> int:
        value = int(count) * int(rate) * multiplier["numerator"]
        return (value + 1_000_000 * multiplier["denominator"] - 1) // (1_000_000 * multiplier["denominator"])
    return sum((
        part(tokens["uncachedInput"], rule["inputMicrousdPerMillion"], input_multiplier),
        part(tokens["cachedInput"], rule["cachedInputMicrousdPerMillion"], input_multiplier),
        part(tokens["cacheWriteInput"], rule["cacheWriteMicrousdPerMillion"], input_multiplier),
        part(tokens["output"], rule["outputMicrousdPerMillion"], output_multiplier),
    ))


def test_shared_vectors_reserve_values() -> None:
    vectors = json.loads(
        (
            Path(__file__).parents[4]
            / "packages/contracts/test-fixtures/cost-conformance-vectors.json"
        ).read_text()
    )
    for vector in vectors:
        if "tokens" in vector and "expectedCostMicrousd" in vector and "remainingCallCosts" not in vector:
            catalogs = json.loads((Path(__file__).parents[4] / "packages/config/src/pricing-catalog.json").read_text())
            model_id = vector.get("modelId", "gpt-5.6-sol")
            rule = next(rule for rule in catalogs["rules"] if rule.get("modelId") == model_id)
            assert _price(vector["tokens"], rule) == int(vector["expectedCostMicrousd"])
        if "remainingCallCosts" in vector:
            assert required_reserve_microusd(
                [int(value) for value in vector["remainingCallCosts"]]
            ) == int(vector["expectedReserveMicrousd"])
