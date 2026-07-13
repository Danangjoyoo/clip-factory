from pathlib import Path

import httpx

from clip_factory.adapters.youtube.connection_event_http_sink import (
    ConnectionEventHttpSink,
)
from clip_factory.adapters.youtube.google_oauth_gateway import GoogleOAuthGateway
from clip_factory.adapters.youtube.keychain_credential_vault import (
    MacOSKeychainCredentialVault,
)
from clip_factory.adapters.youtube.redis_oauth_state_store import (
    RedisOAuthStateStore,
)
from clip_factory.application.youtube_publishing.active_oauth_flow_store import (
    InMemoryActiveOAuthFlowStore,
)
from clip_factory.application.youtube_publishing.oauth_service import (
    YouTubeOAuthService,
)
from clip_factory.composition.settings import WorkerSettings
from clip_factory.composition.worker_container import (
    build_youtube_oauth_activities,
    build_youtube_oauth_service,
)
from clip_factory.entrypoints.temporal.youtube_publishing.oauth_activities import (
    YouTubeOAuthActivities,
)


class FakeKeyringBackend:
    def set_password(self, service_name: str, username: str, password: str) -> None:
        del service_name, username, password

    def get_password(self, service_name: str, username: str) -> str | None:
        del service_name, username
        return None

    def delete_password(self, service_name: str, username: str) -> None:
        del service_name, username


class FakeRedis:
    async def set(self, name: str, value: str, *, ex: int) -> bool:
        del name, value, ex
        return True

    async def get(self, name: str) -> str | None:
        del name
        return None

    async def getdel(self, name: str) -> str | None:
        del name
        return None


def write_client_config(path: Path) -> None:
    path.write_text(
        '{"installed":{"client_id":"desktop-id","client_secret":"sentinel-client-config",'
        '"auth_uri":"https://unused.example/auth",'
        '"token_uri":"https://unused.example/token"}}',
        encoding="utf-8",
    )
    path.chmod(0o600)


def test_worker_container_builds_youtube_oauth_service_from_native_adapters(
    tmp_path: Path,
) -> None:
    client_config = tmp_path / "google-client.json"
    write_client_config(client_config)
    settings = WorkerSettings.from_mapping(
        {
            "INTERNAL_SERVICE_TOKEN": "local-test-token",
            "YOUTUBE_OAUTH_CLIENT_CONFIG_PATH": str(client_config),
            "YOUTUBE_OAUTH_BASE_URL": "https://accounts.example",
            "GOOGLE_TOKEN_BASE_URL": "https://oauth2.example",
            "YOUTUBE_API_BASE_URL": "https://youtube.example/youtube",
            "INTERNAL_API_BASE_URL": "https://web.internal",
        }
    )

    service = build_youtube_oauth_service(
        settings,
        keychain_backend=FakeKeyringBackend(),
        redis=FakeRedis(),
        http=httpx.AsyncClient(),
    )

    assert isinstance(service, YouTubeOAuthService)
    assert isinstance(service._gateway, GoogleOAuthGateway)
    assert isinstance(service._vault, MacOSKeychainCredentialVault)
    assert isinstance(service._state_store, RedisOAuthStateStore)
    assert isinstance(service._events, ConnectionEventHttpSink)
    assert isinstance(service._active_flows, InMemoryActiveOAuthFlowStore)
    assert service._gateway._config.authorization_endpoint == (
        "https://accounts.example/o/oauth2/v2/auth"
    )
    assert service._gateway._config.token_endpoint == "https://oauth2.example/token"
    assert service._events._event_endpoint == (
        "https://web.internal/api/internal/v1/youtube/connections/events"
    )


def test_worker_container_builds_retry_safe_youtube_oauth_activities(
    tmp_path: Path,
) -> None:
    client_config = tmp_path / "google-client.json"
    write_client_config(client_config)
    settings = WorkerSettings.from_mapping(
        {
            "INTERNAL_SERVICE_TOKEN": "local-test-token",
            "YOUTUBE_OAUTH_CLIENT_CONFIG_PATH": str(client_config),
            "YOUTUBE_OAUTH_BASE_URL": "https://accounts.example",
            "GOOGLE_TOKEN_BASE_URL": "https://oauth2.example",
            "YOUTUBE_API_BASE_URL": "https://youtube.example/youtube",
            "INTERNAL_API_BASE_URL": "https://web.internal",
        }
    )

    activities = build_youtube_oauth_activities(
        settings,
        keychain_backend=FakeKeyringBackend(),
        redis=FakeRedis(),
        http=httpx.AsyncClient(),
    )

    assert isinstance(activities, YouTubeOAuthActivities)
    assert activities._receipt_store.__class__.__name__ == (
        "RedisOAuthCompletionReceiptStore"
    )
    assert isinstance(activities._event_sink, ConnectionEventHttpSink)
    assert activities._oauth_service._events.__class__.__name__ == (
        "NoopConnectionEventSink"
    )
