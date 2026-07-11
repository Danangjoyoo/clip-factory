import asyncio

import pytest

from clip_factory.adapters.process.asyncio_process_runner import (
    AsyncioProcessRunner,
    ProcessExecutionError,
)


def test_runner_timeout_reaps_process() -> None:
    async def run() -> None:
        with pytest.raises(ProcessExecutionError, match="PROCESS_TIMEOUT"):
            await AsyncioProcessRunner().run(["python", "-c", "import time; time.sleep(5)"], timeout=0.01)

    asyncio.run(run())


def test_runner_cancellation_reaps_process() -> None:
    async def run() -> None:
        cancelled = asyncio.Event()
        task = asyncio.create_task(
            AsyncioProcessRunner().run(["python", "-c", "import time; time.sleep(5)"], cancellation=cancelled)
        )
        await asyncio.sleep(0.05)
        cancelled.set()
        with pytest.raises(asyncio.CancelledError):
            await task

    asyncio.run(run())
