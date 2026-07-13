from datetime import timedelta
from typing import Any, Protocol

from temporalio import activity

from clip_factory.entrypoints.contracts.generated.youtube_publishing import (
    OAuthConnectionWorkflowInputV1,
    OAuthConnectionWorkflowResultV1,
)
from clip_factory.ports.youtube_publishing.credential_vault import CredentialVault
from clip_factory.ports.youtube_publishing.oauth import SanitizedChannelConnection
from clip_factory.ports.youtube_publishing.oauth_completion_receipt_store import (
    OAuthCompletionReceiptStore,
)


class OAuthAuthorizationService(Protocol):
    async def authorize(self, connection_id: str) -> SanitizedChannelConnection: ...

    async def refresh(self, connection_id: str) -> SanitizedChannelConnection: ...


class OAuthResultEventSink(Protocol):
    async def connected(self, connection: SanitizedChannelConnection) -> None: ...

    async def failed(self, connection_id: str, reason_code: str) -> None: ...


class YouTubeOAuthActivities:
    def __init__(
        self,
        *,
        oauth_service: OAuthAuthorizationService,
        credential_vault: CredentialVault,
        receipt_store: OAuthCompletionReceiptStore,
        event_sink: OAuthResultEventSink,
        receipt_ttl: timedelta,
    ) -> None:
        self._oauth_service = oauth_service
        self._credential_vault = credential_vault
        self._receipt_store = receipt_store
        self._event_sink = event_sink
        self._receipt_ttl = receipt_ttl

    async def authorize_or_resume_oauth_activity(
        self,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        workflow_input = OAuthConnectionWorkflowInputV1.model_validate(payload)
        connection_id = str(workflow_input.connectionId.root)
        receipt = await self._receipt_store.get_connected(connection_id)
        if receipt is not None:
            return _connected_result(connection_id)
        if await self._credential_vault.contains(connection_id):
            connection = await self._oauth_service.refresh(connection_id)
            await self._receipt_store.put_connected(connection, self._receipt_ttl)
            return _connected_result(connection_id)
        try:
            connection = await self._oauth_service.authorize(connection_id)
        except Exception as error:
            if _is_consent_denied(error):
                return _terminal_result(connection_id, "CONSENT_DENIED")
            raise
        await self._receipt_store.put_connected(connection, self._receipt_ttl)
        return _connected_result(connection_id)

    async def deliver_oauth_result_activity(
        self,
        result: dict[str, Any],
    ) -> None:
        workflow_result = OAuthConnectionWorkflowResultV1.model_validate(result)
        connection_id = str(workflow_result.connectionId.root)
        if workflow_result.status.value == "CONNECTED":
            connection = await self._receipt_store.get_connected(connection_id)
            if connection is None:
                raise RuntimeError("OAuth completion receipt is missing")
            await self._event_sink.connected(connection)
            return
        if workflow_result.safeReasonCode is not None:
            await self._event_sink.failed(
                connection_id,
                workflow_result.safeReasonCode.value,
            )


_configured_activities: YouTubeOAuthActivities | None = None


def configure_youtube_oauth_activities(
    activities: YouTubeOAuthActivities,
) -> None:
    global _configured_activities
    _configured_activities = activities


def _connected_result(connection_id: str) -> dict[str, Any]:
    return OAuthConnectionWorkflowResultV1.model_validate(
        {
            "contractVersion": 1,
            "connectionId": connection_id,
            "status": "CONNECTED",
            "safeReasonCode": None,
        }
    ).model_dump(mode="json")


def _terminal_result(connection_id: str, reason_code: str) -> dict[str, Any]:
    return OAuthConnectionWorkflowResultV1.model_validate(
        {
            "contractVersion": 1,
            "connectionId": connection_id,
            "status": "DISCONNECTED",
            "safeReasonCode": reason_code,
        }
    ).model_dump(mode="json")


def _is_consent_denied(error: Exception) -> bool:
    return error.__class__.__name__ in {
        "LoopbackConsentDeniedError",
        "OAuthConsentDeniedError",
        "FakeConsentDeniedError",
    }


@activity.defn(name="authorize_or_resume_oauth_activity")
async def authorize_or_resume_oauth_activity(
    payload: dict[str, Any],
) -> dict[str, Any]:
    if _configured_activities is None:
        raise NotImplementedError("NOT_IMPLEMENTED:authorize_or_resume_oauth")
    return await _configured_activities.authorize_or_resume_oauth_activity(payload)


@activity.defn(name="deliver_oauth_result_activity")
async def deliver_oauth_result_activity(
    result: dict[str, Any],
) -> None:
    if _configured_activities is None:
        raise NotImplementedError("NOT_IMPLEMENTED:deliver_oauth_result")
    await _configured_activities.deliver_oauth_result_activity(result)
