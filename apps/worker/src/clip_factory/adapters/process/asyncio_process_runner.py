"""Safe argv-only subprocess execution."""

import asyncio
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
    return " ".join(part for part in text.splitlines() if "/" not in part and "\\" not in part)


class AsyncioProcessRunner:
    async def run(
        self,
        argv: Sequence[str | Path],
        on_stdout_line: Callable[[str], Awaitable[None] | None] | None = None,
        cancellation: asyncio.Event | None = None,
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

        stdout_task = asyncio.create_task(read_stdout())
        try:
            if cancellation is None:
                await process.wait()
            else:
                await asyncio.wait(
                    {asyncio.create_task(process.wait()), asyncio.create_task(cancellation.wait())},
                    return_when=asyncio.FIRST_COMPLETED,
                )
                if cancellation.is_set() and process.returncode is None:
                    process.terminate()
                    await process.wait()
                    raise asyncio.CancelledError
            stdout = await stdout_task
            stderr = await process.stderr.read() if process.stderr else b""
            return process.returncode or 0, stdout, _safe_stderr(stderr)
        finally:
            if not stdout_task.done():
                stdout_task.cancel()
