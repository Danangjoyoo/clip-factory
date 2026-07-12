from typing import Protocol


class SystemBrowser(Protocol):
    async def open(self, url: str) -> None: ...
