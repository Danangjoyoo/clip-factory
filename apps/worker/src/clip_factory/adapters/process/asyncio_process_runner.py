"""Safe argv-only subprocess execution."""

import asyncio
import os
import signal
from collections.abc import Awaitable, Callable, Sequence
from pathlib import Path

from clip_factory.ports.process_runner import ProcessOutput

MAX_STDERR_BYTES = 64 * 1024


class ProcessExecutionError(RuntimeError):
    def __init__(self, code: str, stderr: str = "") -> None:
        self.code = code
        super().__init__(code)
        self.stderr = stderr


def _safe_stderr(value: bytes) -> str:
    text = value[:MAX_STDERR_BYTES].decode("utf-8", "replace")
    # Paths are deliberately not included in adapter failures/logs.
    return " ".join(
        part for part in text.splitlines() if "/" not in part and "\\" not in part
    )


class AsyncioProcessRunner:
    async def run(
        self,
        argv: Sequence[str | Path],
        on_stdout_line: Callable[[str], Awaitable[None] | None] | None = None,
        cancellation: asyncio.Event | None = None,
        timeout: float | None = None,
    ) -> ProcessOutput:
        if not argv or any(not str(part) for part in argv):
            raise ValueError("argv must not be empty")
        process = await asyncio.create_subprocess_exec(
            *(str(part) for part in argv),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            start_new_session=True,
        )

        async def read_stdout() -> str:
            assert process.stdout is not None
            lines: list[str] = []
            async for raw in process.stdout:
                line = raw.decode("utf-8", "replace").rstrip("\r\n")
                lines.append(line)
                if on_stdout_line:
                    result = on_stdout_line(line)
                    if asyncio.iscoroutine(result):
                        await result
            return "\n".join(lines)

        async def read_stderr() -> str:
            assert process.stderr is not None
            captured = bytearray()
            while chunk := await process.stderr.read(4096):
                if len(captured) < MAX_STDERR_BYTES:
                    captured.extend(chunk[: MAX_STDERR_BYTES - len(captured)])
            return _safe_stderr(bytes(captured))

        stdout_task = asyncio.create_task(read_stdout())
        stderr_task = asyncio.create_task(read_stderr())
        wait_task = asyncio.create_task(process.wait())
        cancel_task = asyncio.create_task(cancellation.wait()) if cancellation else None
        try:
            waiters = {wait_task} | ({cancel_task} if cancel_task else set())
            done, _ = await asyncio.wait(
                waiters, timeout=timeout, return_when=asyncio.FIRST_COMPLETED
            )
            if not done:
                _kill_process_group(process)
                await wait_task
                raise ProcessExecutionError("PROCESS_TIMEOUT")
            if cancel_task and cancel_task in done and process.returncode is None:
                _kill_process_group(process)
                await wait_task
                raise asyncio.CancelledError
            stdout = await stdout_task
            stderr = await stderr_task
            return process.returncode or 0, stdout, stderr
        finally:
            if process.returncode is None:
                _kill_process_group(process)
                await wait_task
            if cancel_task and not cancel_task.done():
                cancel_task.cancel()
                await asyncio.gather(cancel_task, return_exceptions=True)
            if not wait_task.done():
                wait_task.cancel()
                await asyncio.gather(wait_task, return_exceptions=True)
            if not stdout_task.done():
                stdout_task.cancel()
                await asyncio.gather(stdout_task, return_exceptions=True)
            if not stderr_task.done():
                stderr_task.cancel()
                await asyncio.gather(stderr_task, return_exceptions=True)


def _kill_process_group(process: asyncio.subprocess.Process) -> None:
    if process.returncode is not None:
        return
    try:
        os.killpg(process.pid, signal.SIGTERM)
    except ProcessLookupError:
        return
