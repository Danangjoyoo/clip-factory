import asyncio

import httpx
import pytest

from clip_factory.adapters.youtube.loopback_callback_listener import (
    LoopbackCallbackListener,
    OAuthConsentDeniedError,
)


def test_accepts_one_exact_callback_then_closes() -> None:
    async def scenario() -> None:
        listener = LoopbackCallbackListener(timeout_seconds=1)
        callback_uri = await listener.start()
        assert callback_uri.startswith("http://127.0.0.1:")

        callback_task = asyncio.create_task(listener.wait_for_callback())
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{callback_uri}?code=code-1&state=state-1",
                headers={
                    "Host": callback_uri.removeprefix("http://").split("/")[0]
                },
            )
            assert response.status_code == 200
            assert "return to Clip Factory" in response.text
            callback = await callback_task
            assert callback.code == "code-1"
            assert callback.state == "state-1"
            with pytest.raises(httpx.ConnectError):
                await client.get(callback_uri)

    asyncio.run(scenario())


def test_rejects_wrong_path_denial_and_timeout_without_query_logging(
    caplog: pytest.LogCaptureFixture,
) -> None:
    async def scenario() -> None:
        listener = LoopbackCallbackListener(timeout_seconds=0.01)
        callback_uri = await listener.start()
        wrong = callback_uri.replace("/oauth2/callback", "/wrong")
        async with httpx.AsyncClient() as client:
            assert (await client.get(wrong)).status_code == 404
        with pytest.raises(TimeoutError, match="OAuth callback timed out"):
            await listener.wait_for_callback()

    asyncio.run(scenario())
    assert "code=" not in caplog.text
    assert "state=" not in caplog.text


def test_denial_callback_returns_typed_error() -> None:
    async def scenario() -> None:
        listener = LoopbackCallbackListener(timeout_seconds=1)
        callback_uri = await listener.start()
        callback_task = asyncio.create_task(listener.wait_for_callback())
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{callback_uri}?error=access_denied&state=state-1",
                headers={
                    "Host": callback_uri.removeprefix("http://").split("/")[0]
                },
            )
        assert response.status_code == 200
        with pytest.raises(OAuthConsentDeniedError):
            await callback_task

    asyncio.run(scenario())


def test_unexpected_host_is_rejected() -> None:
    async def scenario() -> None:
        listener = LoopbackCallbackListener(timeout_seconds=0.01)
        callback_uri = await listener.start()
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{callback_uri}?code=code-1&state=state-1",
                headers={"Host": "localhost"},
            )
        assert response.status_code == 400
        with pytest.raises(TimeoutError):
            await listener.wait_for_callback()

    asyncio.run(scenario())
