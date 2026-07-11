import clip_factory.entrypoints.temporal.worker as worker_module


def test_worker_configures_runtime_concurrency(monkeypatch) -> None:
    captured = {}

    class FakeWorker:
        def __init__(self, _client, **kwargs):
            captured.update(kwargs)

    monkeypatch.setattr(worker_module, "Worker", FakeWorker)
    worker_module.build_worker(object())
    assert captured["max_concurrent_activities"] == 1
    assert captured["max_concurrent_workflow_tasks"] == 20
