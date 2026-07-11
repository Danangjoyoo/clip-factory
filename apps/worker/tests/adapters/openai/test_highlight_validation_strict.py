import pytest

from clip_factory.adapters.openai.highlight_adapter import _candidate


def test_candidate_requires_all_structured_fields() -> None:
    with pytest.raises(KeyError):
        _candidate({"startMs": 0, "endMs": 1})
