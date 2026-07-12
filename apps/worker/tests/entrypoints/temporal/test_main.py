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

    class FakeServer:
        def close(self):
            captured["closed"] = True

        async def wait_closed(self):
            captured["wait_closed"] = True

    monkeypatch.setenv("INTERNAL_SERVICE_TOKEN", "test-token")
    monkeypatch.setenv("TEMPORAL_ADDRESS", "temporal.test:7233")
    monkeypatch.setenv("TEMPORAL_TASK_QUEUE", "test-queue")
    monkeypatch.setattr(entrypoint, "Client", FakeClient)
    monkeypatch.setattr(entrypoint, "start_health_server", lambda _port: _server())
    monkeypatch.setattr(
        entrypoint,
        "build_worker",
        lambda client, task_queue: (
            captured.update({"client": client, "task_queue": task_queue})
            or FakeWorker()
        ),
    )

    async def _server():
        return FakeServer()

    asyncio.run(entrypoint.run_worker())

    assert captured == {
        "address": "temporal.test:7233",
        "client": captured["client"],
        "task_queue": "test-queue",
        "ran": True,
        "closed": True,
        "wait_closed": True,
    }


def test_run_worker_closes_health_server_on_worker_exit(monkeypatch) -> None:
    captured = {}

    class FakeClient:
        @classmethod
        async def connect(cls, _address):
            return object()

    class FakeServer:
        def close(self):
            captured["closed"] = True

        async def wait_closed(self):
            captured["wait_closed"] = True

    class FakeWorker:
        async def run(self):
            raise RuntimeError("worker stopped")

    monkeypatch.setenv("INTERNAL_SERVICE_TOKEN", "test-token")
    monkeypatch.setattr(entrypoint, "Client", FakeClient)
    monkeypatch.setattr(entrypoint, "build_worker", lambda *_args: FakeWorker())
    monkeypatch.setattr(entrypoint, "start_health_server", lambda _port: _server())

    async def _server():
        return FakeServer()

    try:
        asyncio.run(entrypoint.run_worker())
    except RuntimeError as error:
        assert str(error) == "worker stopped"

    assert captured == {"closed": True, "wait_closed": True}
