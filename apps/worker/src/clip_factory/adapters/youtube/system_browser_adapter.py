import asyncio
import webbrowser


class SystemBrowserOpenError(RuntimeError):
    pass


class SystemBrowserAdapter:
    async def open(self, url: str) -> None:
        opened = await asyncio.to_thread(webbrowser.open_new_tab, url)
        if not opened:
            raise SystemBrowserOpenError(
                "system browser rejected the authorization URL"
            )
