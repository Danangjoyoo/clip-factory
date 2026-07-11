from collections.abc import Sequence

from clip_factory.domain.cost import BudgetDecision, verify_remaining_budget


def verify_budget(
    remaining_budget: int, worst_case_calls: Sequence[int]
) -> BudgetDecision:
    return verify_remaining_budget(remaining_budget, tuple(worst_case_calls))
