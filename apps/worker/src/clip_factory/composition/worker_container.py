from collections.abc import Callable
from datetime import UTC, datetime, timedelta
import secrets
from typing import Any, cast

import httpx
from redis import asyncio as redis_asyncio

from clip_factory.adapters.youtube.client_config import load_desktop_client_config
from clip_factory.adapters.youtube.connection_event_http_sink import (
    ConnectionEventHttpSink,
)
from clip_factory.adapters.youtube.google_oauth_gateway import (
    GoogleOAuthGateway,
    GoogleOAuthGatewayConfig,
)
from clip_factory.adapters.youtube.keychain_credential_vault import (
    KeyringBackend,
    MacOSKeychainCredentialVault,
    require_macos_keychain_backend,
)
from clip_factory.adapters.youtube.loopback_callback_listener import (
    LoopbackCallbackListener,
)
from clip_factory.adapters.youtube.redis_oauth_state_store import (
    RedisOAuthStateStore,
    RedisStateBackend,
)
from clip_factory.adapters.youtube.redis_oauth_completion_receipt_store import (
    RedisCompletionReceiptBackend,
    RedisOAuthCompletionReceiptStore,
)
from clip_factory.adapters.youtube.system_browser_adapter import SystemBrowserAdapter
from clip_factory.application.youtube_publishing.active_oauth_flow_store import (
    InMemoryActiveOAuthFlowStore,
)
from clip_factory.application.youtube_publishing.oauth_service import (
    YouTubeOAuthService,
)
from clip_factory.composition.settings import WorkerSettings
from clip_factory.entrypoints.temporal.youtube_publishing.oauth_activities import (
    YouTubeOAuthActivities,
)
from clip_factory.entrypoints.temporal.activities.project_activities import (
    extract_audio,
    prepare_editor,
    prepare_manual_clip,
    transcribe,
    load_transcript_text,
    validate_source,
)
from clip_factory.entrypoints.temporal.child_workflows import (
    execute_analysis_child,
    persist_budget_action,
    verify_analysis_budget,
)
from clip_factory.entrypoints.temporal.activities.highlight_activities import (
    call_openai_once_activity,
    reconcile_paid_call_activity,
    reserve_paid_call_activity,
)
from clip_factory.ports.youtube_publishing.runtime import LoopbackOAuthCallback


class SystemClock:
    def now(self) -> datetime:
        return datetime.now(UTC)


class SystemEntropy:
    def bytes(self, size: int) -> bytes:
        return secrets.token_bytes(size)


class LoopbackRedirectUriBinder:
    def __init__(self, timeout_seconds: float = 600) -> None:
        self._timeout_seconds = timeout_seconds
        self._listener: LoopbackCallbackListener | None = None

    async def bind(self) -> str:
        self._listener = LoopbackCallbackListener(self._timeout_seconds)
        return await self._listener.start()

    async def wait_for_callback(self) -> LoopbackOAuthCallback:
        if self._listener is None:
            raise RuntimeError("OAuth callback listener is not started")
        callback = await self._listener.wait_for_callback()
        return LoopbackOAuthCallback(code=callback.code, state=callback.state)


class NoopConnectionEventSink:
    async def connected(self, connection: object) -> None:
        del connection

    async def disconnected(self, result: object) -> None:
        del result


def build_youtube_oauth_service(
    settings: WorkerSettings,
    *,
    keychain_backend: KeyringBackend | None = None,
    redis: RedisStateBackend | None = None,
    http: httpx.AsyncClient | None = None,
) -> YouTubeOAuthService:
    if settings.youtube_oauth_client_config_path is None:
        raise ValueError("YOUTUBE_OAUTH_CLIENT_CONFIG_PATH is required")
    client_config = load_desktop_client_config(settings.youtube_oauth_client_config_path)
    http_client = http or httpx.AsyncClient()
    keychain = MacOSKeychainCredentialVault(
        keychain_backend or require_macos_keychain_backend()
    )
    clock = SystemClock()
    redis_client = cast(
        RedisStateBackend,
        redis
        or redis_asyncio.from_url(
            settings.redis_url,
            decode_responses=True,
        ),
    )
    return YouTubeOAuthService(
        gateway=GoogleOAuthGateway(
            http=http_client,
            vault=keychain,
            config=GoogleOAuthGatewayConfig(
                client_id=client_config.client_id,
                client_secret=client_config.client_secret,
                authorization_endpoint=settings.youtube_oauth_authorization_endpoint,
                token_endpoint=settings.google_token_endpoint,
                revoke_endpoint=settings.google_revoke_endpoint,
                youtube_api_base_url=settings.youtube_api_base_url,
            ),
            now=clock.now,
        ),
        vault=keychain,
        state_store=RedisOAuthStateStore(redis=redis_client, now=clock.now),
        browser=SystemBrowserAdapter(),
        events=ConnectionEventHttpSink(
            http=http_client,
            event_endpoint=settings.youtube_connection_event_endpoint,
            internal_service_token=settings.internal_service_token,
        ),
        clock=clock,
        entropy=SystemEntropy(),
        loopback_listener=LoopbackRedirectUriBinder(),
        active_flows=InMemoryActiveOAuthFlowStore(),
    )


def build_youtube_oauth_activities(
    settings: WorkerSettings,
    *,
    keychain_backend: KeyringBackend | None = None,
    redis: RedisStateBackend | None = None,
    http: httpx.AsyncClient | None = None,
) -> YouTubeOAuthActivities:
    if settings.youtube_oauth_client_config_path is None:
        raise ValueError("YOUTUBE_OAUTH_CLIENT_CONFIG_PATH is required")
    client_config = load_desktop_client_config(settings.youtube_oauth_client_config_path)
    http_client = http or httpx.AsyncClient()
    keychain = MacOSKeychainCredentialVault(
        keychain_backend or require_macos_keychain_backend()
    )
    clock = SystemClock()
    redis_client = cast(
        RedisStateBackend,
        redis
        or redis_asyncio.from_url(
            settings.redis_url,
            decode_responses=True,
        ),
    )
    receipt_store = RedisOAuthCompletionReceiptStore(
        redis=cast(RedisCompletionReceiptBackend, redis_client)
    )
    oauth_service = YouTubeOAuthService(
        gateway=GoogleOAuthGateway(
            http=http_client,
            vault=keychain,
            config=GoogleOAuthGatewayConfig(
                client_id=client_config.client_id,
                client_secret=client_config.client_secret,
                authorization_endpoint=settings.youtube_oauth_authorization_endpoint,
                token_endpoint=settings.google_token_endpoint,
                revoke_endpoint=settings.google_revoke_endpoint,
                youtube_api_base_url=settings.youtube_api_base_url,
            ),
            now=clock.now,
        ),
        vault=keychain,
        state_store=RedisOAuthStateStore(redis=redis_client, now=clock.now),
        browser=SystemBrowserAdapter(),
        events=NoopConnectionEventSink(),
        clock=clock,
        entropy=SystemEntropy(),
        loopback_listener=LoopbackRedirectUriBinder(),
        active_flows=InMemoryActiveOAuthFlowStore(),
    )
    return YouTubeOAuthActivities(
        oauth_service=oauth_service,
        credential_vault=keychain,
        receipt_store=receipt_store,
        event_sink=ConnectionEventHttpSink(
            http=http_client,
            event_endpoint=settings.youtube_connection_event_endpoint,
            internal_service_token=settings.internal_service_token,
        ),
        receipt_ttl=timedelta(hours=24),
    )


def project_activities() -> list[Callable[..., Any]]:
    return [
        validate_source,
        extract_audio,
        transcribe,
        load_transcript_text,
        prepare_editor,
        prepare_manual_clip,
        verify_analysis_budget,
        persist_budget_action,
        execute_analysis_child,
        call_openai_once_activity,
        reserve_paid_call_activity,
        reconcile_paid_call_activity,
    ]
