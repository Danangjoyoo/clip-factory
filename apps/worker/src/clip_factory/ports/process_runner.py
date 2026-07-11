from collections.abc import Awaitable, Callable, Sequence
from pathlib import Path
from typing import Protocol

ProcessOutput = tuple[int, str, str]


class ProcessRunner(Protocol):
    async def run(
        self,
        argv: Sequence[str | Path],
        on_stdout_line: Callable[[str], Awaitable[None] | None] | None = None,
    ) -> ProcessOutput: ...
