import pytest

from clip_factory.application.verify_budget import verify_budget


def test_negative_budget_is_rejected() -> None:
    with pytest.raises(ValueError):
        verify_budget(-1, [1])
