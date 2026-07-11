import pytest

from clip_factory.composition.settings import WorkerSettings


def test_worker_requires_openai_key_only_when_paid_adapter_is_selected() -> None:
    fake = WorkerSettings.from_mapping({'OPENAI_ADAPTER': 'fake', 'INTERNAL_SERVICE_TOKEN': 'local-test-token'})
    assert fake.openai_api_key is None
    with pytest.raises(ValueError, match='OPENAI_API_KEY is required for live OpenAI adapter'):
        WorkerSettings.from_mapping({'OPENAI_ADAPTER': 'live', 'INTERNAL_SERVICE_TOKEN': 'local-test-token'})
