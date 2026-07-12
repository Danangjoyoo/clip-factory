import signal
from dataclasses import dataclass, field
from typing import Any

import pytest

from clip_factory.application.cancel_job import CancelJob, terminate_process_group
from clip_factory.application.cleanup_job import CleanupJob
from clip_factory.application.reconcile_job import ReconcileJob


@dataclass
class Process:
    returncode: int | None = None
    signals: list[int] = field(default_factory=list)
    waits: int = 0

    def send_signal(self, value: int) -> None:
        self.signals.append(value)

    async def wait(self) -> int:
        self.waits += 1
        self.returncode = 0
        return 0


class Clock:
    def __init__(self, timeout: bool = False) -> None:
        self.timeout = timeout

    async def wait_for(self, awaitable: Any, timeout_seconds: float) -> object:
        if self.timeout:
            awaitable.close()
            raise TimeoutError
        return await awaitable


@pytest.mark.anyio
async def test_terminate_process_group_skips_exited_process() -> None:
    process = Process(returncode=0)

    await terminate_process_group(process, Clock())

    assert process.signals == []


@pytest.mark.anyio
async def test_terminate_process_group_escalates_after_timeout() -> None:
    process = Process()

    await terminate_process_group(process, Clock(timeout=True))

    assert process.signals == [signal.SIGTERM, signal.SIGKILL]
    assert process.waits == 1


@pytest.mark.anyio
async def test_cancel_job_delegates_to_workflow() -> None:
    class Workflow:
        cancelled: list[str]

        def __init__(self) -> None:
            self.cancelled = []

        async def cancel(self, workflow_id: str) -> None:
            self.cancelled.append(workflow_id)

    workflow = Workflow()

    await CancelJob(workflow).execute("workflow-1")

    assert workflow.cancelled == ["workflow-1"]


@pytest.mark.anyio
async def test_cleanup_job_deletes_only_project_temp_keys() -> None:
    class Store:
        aborted: list[str]
        deleted: tuple[str, list[str]] | None

        def __init__(self) -> None:
            self.aborted = []
            self.deleted = None

        async def abort_multipart(self, upload_id: str) -> None:
            self.aborted.append(upload_id)

        async def delete_project_temporary(
            self, project_id: str, object_keys: list[str]
        ) -> None:
            self.deleted = (project_id, object_keys)

    store = Store()

    await CleanupJob(store).execute(
        "p1",
        ["projects/p1/tmp/a", "projects/p2/tmp/b", "projects/p1/final/c"],
        ["u1", "u2"],
    )

    assert store.aborted == ["u1", "u2"]
    assert store.deleted == ("p1", ["projects/p1/tmp/a"])


@pytest.mark.anyio
async def test_reconcile_job_marks_offline_before_rebuild() -> None:
    class State:
        calls: list[tuple[str, object]]

        def __init__(self) -> None:
            self.calls = []

        async def mark_offline(self, project_id: str) -> None:
            self.calls.append(("offline", project_id))

        async def rebuild(self, project_id: str, events: list[dict[str, Any]]) -> None:
            self.calls.append(("rebuild", (project_id, events)))

    state = State()
    events = [{"type": "WORKER_OFFLINE"}]

    await ReconcileJob(state).execute("p1", events, worker_online=False)

    assert state.calls == [("offline", "p1"), ("rebuild", ("p1", events))]
