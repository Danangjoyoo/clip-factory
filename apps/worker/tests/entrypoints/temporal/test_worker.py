from clip_factory.entrypoints.temporal.worker import build_worker
import inspect


def test_worker_configures_single_activity_slot() -> None:
    assert "max_concurrent_activities=1" in inspect.getsource(build_worker)
