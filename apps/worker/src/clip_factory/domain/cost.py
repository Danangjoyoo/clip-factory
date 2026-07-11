from dataclasses import dataclass


@dataclass(frozen=True)
class BudgetDecision:
    allowed: bool
    required_microusd: int
    remaining_microusd: int


def required_reserve_microusd(costs: list[int] | tuple[int, ...]) -> int:
    if any(cost < 0 for cost in costs):
        raise ValueError("costs must be nonnegative")
    return (sum(costs) * 3 + 1) // 2


def verify_remaining_budget(
    remaining_budget: int, worst_case_calls: list[int] | tuple[int, ...]
) -> BudgetDecision:
    if remaining_budget < 0 or any(cost < 0 for cost in worst_case_calls):
        raise ValueError("budget and costs must be nonnegative")
    reserve = required_reserve_microusd(worst_case_calls)
    return BudgetDecision(reserve <= remaining_budget, reserve, remaining_budget)
