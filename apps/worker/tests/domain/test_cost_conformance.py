import json
from pathlib import Path
from typing import TypedDict, cast

from clip_factory.domain.cost import required_reserve_microusd


class Multiplier(TypedDict):
    numerator: int
    denominator: int


class PriceRule(TypedDict):
    longContextThresholdTokens: int
    longContextInputMultiplier: Multiplier
    longContextOutputMultiplier: Multiplier
    inputMicrousdPerMillion: int
    cachedInputMicrousdPerMillion: int
    cacheWriteMicrousdPerMillion: int
    outputMicrousdPerMillion: int


def _price(tokens: dict[str, str], rule: PriceRule) -> int:
    total = sum(
        int(tokens[key]) for key in ("uncachedInput", "cachedInput", "cacheWriteInput")
    )
    long = total > int(rule["longContextThresholdTokens"])
    input_multiplier = (
        rule["longContextInputMultiplier"]
        if long
        else {"numerator": 1, "denominator": 1}
    )
    output_multiplier = (
        rule["longContextOutputMultiplier"]
        if long
        else {"numerator": 1, "denominator": 1}
    )

    def part(count: str, rate: int, multiplier: Multiplier) -> int:
        value = int(count) * rate * multiplier["numerator"]
        return (value + 1_000_000 * multiplier["denominator"] - 1) // (
            1_000_000 * multiplier["denominator"]
        )

    return sum(
        [
            part(
                tokens["uncachedInput"],
                rule["inputMicrousdPerMillion"],
                input_multiplier,
            ),
            part(
                tokens["cachedInput"],
                rule["cachedInputMicrousdPerMillion"],
                input_multiplier,
            ),
            part(
                tokens["cacheWriteInput"],
                rule["cacheWriteMicrousdPerMillion"],
                input_multiplier,
            ),
            part(tokens["output"], rule["outputMicrousdPerMillion"], output_multiplier),
        ]
    )


def test_shared_vectors_reserve_values() -> None:
    vectors = cast(list[dict[str, object]], json.loads(
        (
            Path(__file__).parents[4]
            / "packages/contracts/test-fixtures/cost-conformance-vectors.json"
        ).read_text()
    ))
    for vector in vectors:
        if (
            "tokens" in vector
            and "expectedCostMicrousd" in vector
            and "remainingCallCosts" not in vector
        ):
            catalogs = json.loads(
                (
                    Path(__file__).parents[4]
                    / "packages/config/src/pricing-catalog.json"
                ).read_text()
            )
            model_id = vector.get("modelId", "gpt-5.6-sol")
            rules = cast(list[dict[str, object]], catalogs["rules"])
            rule = cast(
                PriceRule,
                next(rule for rule in rules if rule.get("modelId") == model_id),
            )
            tokens = cast(dict[str, str], vector["tokens"])
            expected = cast(int | str, vector["expectedCostMicrousd"])
            assert _price(tokens, rule) == int(expected)
        if "remainingCallCosts" in vector:
            remaining = cast(list[int | str], vector["remainingCallCosts"])
            expected = cast(int | str, vector["expectedReserveMicrousd"])
            assert required_reserve_microusd([int(value) for value in remaining]) == int(expected)
