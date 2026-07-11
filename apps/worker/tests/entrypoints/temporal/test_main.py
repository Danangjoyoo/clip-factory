import asyncio

from clip_factory.entrypoints.temporal import main as entrypoint


def test_run_worker_connects_and_runs_configured_queue(monkeypatch) -> None:
    captured = {}

    class FakeClient:
        @classmethod
        async def connect(cls, address):
            captured["address"] = address
            return object()

    class FakeWorker:
        async def run(self):
            captured["ran"] = True

    monkeypatch.setenv("INTERNAL_SERVICE_TOKEN", "test-token")
    monkeypatch.setenv("TEMPORAL_ADDRESS", "temporal.test:7233")
    monkeypatch.setenv("TEMPORAL_TASK_QUEUE", "test-queue")
    monkeypatch.setattr(entrypoint, "Client", FakeClient)
    monkeypatch.setattr(
        entrypoint,
        "build_worker",
        lambda client, task_queue: (
            captured.update({"client": client, "task_queue": task_queue})
            or FakeWorker()
        ),
    )

    asyncio.run(entrypoint.run_worker())

    assert captured == {
        "address": "temporal.test:7233",
        "client": captured["client"],
        "task_queue": "test-queue",
        "ran": True,
    }
