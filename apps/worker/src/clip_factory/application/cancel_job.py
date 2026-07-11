from dataclasses import dataclass
from typing import Protocol


class ProcessHandle(Protocol):
    returncode: int | None

    def send_signal(self, signal: int) -> None: ...
    async def wait(self) -> int: ...


class Clock(Protocol):
    async def wait_for(self, awaitable: object, timeout_seconds: float) -> object: ...


class Workflow(Protocol):
    async def cancel(self, workflow_id: str) -> None: ...


async def terminate_process_group(process: ProcessHandle, clock: Clock) -> None:
    if process.returncode is not None:
        return
    import signal

    process.send_signal(signal.SIGTERM)
    try:
        await clock.wait_for(process.wait(), timeout_seconds=10)
    except TimeoutError:
        process.send_signal(signal.SIGKILL)
        await process.wait()


@dataclass
class CancelJob:
    workflow: Workflow

    async def execute(self, workflow_id: str) -> None:
        await self.workflow.cancel(workflow_id)
