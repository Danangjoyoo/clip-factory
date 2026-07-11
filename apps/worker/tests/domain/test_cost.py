from clip_factory.domain.cost import verify_remaining_budget


def test_reserve_rounds_up() -> None:
    assert verify_remaining_budget(451, [101, 200]).allowed is False
    assert verify_remaining_budget(452, [101, 200]).allowed is True
