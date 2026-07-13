import asyncio
import webbrowser

import pytest

from clip_factory.adapters.youtube.system_browser_adapter import (
    SystemBrowserAdapter,
    SystemBrowserOpenError,
)


def test_opens_authorization_url_in_system_browser_tab(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    opened_urls: list[str] = []

    def fake_open_new_tab(url: str) -> bool:
        opened_urls.append(url)
        return True

    monkeypatch.setattr(
        webbrowser,
        "open_new_tab",
        fake_open_new_tab,
    )

    asyncio.run(SystemBrowserAdapter().open("https://accounts.example/oauth"))

    assert opened_urls == ["https://accounts.example/oauth"]


def test_raises_typed_error_when_system_browser_rejects_url(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        webbrowser,
        "open_new_tab",
        lambda _url: False,
    )

    with pytest.raises(
        SystemBrowserOpenError,
        match="system browser rejected the authorization URL",
    ):
        asyncio.run(SystemBrowserAdapter().open("https://accounts.example/oauth"))
