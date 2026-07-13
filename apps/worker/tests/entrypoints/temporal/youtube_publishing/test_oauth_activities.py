import asyncio
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any

import pytest

from clip_factory.entrypoints.contracts.generated.youtube_publishing import (
    OAuthConnectionWorkflowInputV1,
    OAuthConnectionWorkflowResultV1,
)
from clip_factory.entrypoints.temporal.youtube_publishing.oauth_activities import (
    YouTubeOAuthActivities,
)
from clip_factory.ports.youtube_publishing.oauth import SanitizedChannelConnection


CONNECTION_ID = "018f4f2c-93d7-7c75-8f0f-7f5165e8bb42"


def test_authorization_returns_cached_receipt_without_opening_browser() -> None:
    async def scenario() -> None:
        receipt_store = FakeReceiptStore(receipt=make_connection())
        service = FakeOAuthService()
        activities = make_activities(receipt_store=receipt_store, service=service)

        result = await activities.authorize_or_resume_oauth_activity(make_input())

        assert parsed_result(result).status.value == "CONNECTED"
        assert service.authorize_count == 0
        assert service.refresh_count == 0

    asyncio.run(scenario())


def test_authorization_refreshes_existing_keychain_credential_without_browser() -> None:
    async def scenario() -> None:
        receipt_store = FakeReceiptStore()
        service = FakeOAuthService()
        activities = make_activities(
            receipt_store=receipt_store,
            service=service,
            vault=FakeVault(has_credential=True),
        )

        result = await activities.authorize_or_resume_oauth_activity(make_input())

        assert parsed_result(result).status.value == "CONNECTED"
        assert service.refresh_count == 1
        assert service.authorize_count == 0
        assert receipt_store.receipt == make_connection()

    asyncio.run(scenario())


def test_lost_authorization_ack_resumes_receipt_without_reopening_browser() -> None:
    async def scenario() -> None:
        receipt_store = FakeReceiptStore(raise_after_put_once=True)
        service = FakeOAuthService()
        activities = make_activities(receipt_store=receipt_store, service=service)

        with pytest.raises(RuntimeError, match="lost ack"):
            await activities.authorize_or_resume_oauth_activity(make_input())
        result = await activities.authorize_or_resume_oauth_activity(make_input())

        assert parsed_result(result).status.value == "CONNECTED"
        assert service.authorize_count == 1
        assert receipt_store.get_count == 2

    asyncio.run(scenario())


def test_consent_denial_returns_terminal_sanitized_result() -> None:
    async def scenario() -> None:
        service = FakeOAuthService(consent_denied=True)
        activities = make_activities(service=service)

        result = await activities.authorize_or_resume_oauth_activity(make_input())

        parsed = parsed_result(result)
        assert parsed.status.value == "DISCONNECTED"
        assert parsed.safeReasonCode is not None
        assert parsed.safeReasonCode.value == "CONSENT_DENIED"
        assert service.authorize_count == 1

    asyncio.run(scenario())


def test_delivery_reads_receipt_and_posts_connected_event() -> None:
    async def scenario() -> None:
        receipt_store = FakeReceiptStore(receipt=make_connection())
        sink = FakeEventSink()
        activities = make_activities(receipt_store=receipt_store, sink=sink)

        await activities.deliver_oauth_result_activity(make_connected_result())

        assert sink.connected_events == [make_connection()]

    asyncio.run(scenario())


def make_activities(
    *,
    receipt_store: "FakeReceiptStore | None" = None,
    service: "FakeOAuthService | None" = None,
    vault: "FakeVault | None" = None,
    sink: "FakeEventSink | None" = None,
) -> YouTubeOAuthActivities:
    return YouTubeOAuthActivities(
        oauth_service=service or FakeOAuthService(),
        credential_vault=vault or FakeVault(has_credential=False),
        receipt_store=receipt_store or FakeReceiptStore(),
        event_sink=sink or FakeEventSink(),
        receipt_ttl=timedelta(hours=24),
    )


def make_input() -> dict[str, Any]:
    return OAuthConnectionWorkflowInputV1(
        contractVersion=1,
        connectionId=CONNECTION_ID,
        requestedScopes=(
            "https://www.googleapis.com/auth/youtube.upload",
            "https://www.googleapis.com/auth/youtube.readonly",
        ),
    ).model_dump(mode="json")


def make_connected_result() -> dict[str, Any]:
    return OAuthConnectionWorkflowResultV1(
        contractVersion=1,
        connectionId=CONNECTION_ID,
        status="CONNECTED",
        safeReasonCode=None,
    ).model_dump(mode="json")


def parsed_result(payload: dict[str, Any]) -> OAuthConnectionWorkflowResultV1:
    return OAuthConnectionWorkflowResultV1.model_validate(payload)


def make_connection() -> SanitizedChannelConnection:
    return SanitizedChannelConnection(
        connection_id=CONNECTION_ID,
        channel_id="UC-safe-channel",
        channel_title="Clip Factory Test",
        channel_handle="@clipfactorytest",
        avatar_url=None,
        granted_scopes=(
            "https://www.googleapis.com/auth/youtube.upload",
            "https://www.googleapis.com/auth/youtube.readonly",
        ),
        oauth_mode="TESTING",
        refresh_token_expires_at=datetime(2026, 7, 20, tzinfo=UTC),
    )


class FakeReceiptStore:
    def __init__(
        self,
        *,
        receipt: SanitizedChannelConnection | None = None,
        raise_after_put_once: bool = False,
    ) -> None:
        self.receipt = receipt
        self.raise_after_put_once = raise_after_put_once
        self.get_count = 0

    async def get_connected(
        self,
        connection_id: str,
    ) -> SanitizedChannelConnection | None:
        self.get_count += 1
        return self.receipt

    async def put_connected(
        self,
        connection: SanitizedChannelConnection,
        ttl: timedelta,
    ) -> None:
        self.receipt = connection
        if self.raise_after_put_once:
            self.raise_after_put_once = False
            raise RuntimeError("lost ack")


class FakeOAuthService:
    def __init__(self, *, consent_denied: bool = False) -> None:
        self.consent_denied = consent_denied
        self.authorize_count = 0
        self.refresh_count = 0

    async def authorize(self, connection_id: str) -> SanitizedChannelConnection:
        self.authorize_count += 1
        if self.consent_denied:
            raise FakeConsentDeniedError("OAuth denied")
        return make_connection()

    async def refresh(self, connection_id: str) -> SanitizedChannelConnection:
        self.refresh_count += 1
        return make_connection()


@dataclass(frozen=True, slots=True)
class FakeVault:
    has_credential: bool

    async def contains(self, connection_id: str) -> bool:
        return self.has_credential


class FakeEventSink:
    def __init__(self) -> None:
        self.connected_events: list[SanitizedChannelConnection] = []

    async def connected(self, connection: SanitizedChannelConnection) -> None:
        self.connected_events.append(connection)

    async def failed(self, connection_id: str, reason_code: str) -> None:
        pass


class FakeConsentDeniedError(RuntimeError):
    pass
