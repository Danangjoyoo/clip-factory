import asyncio
from datetime import timedelta
from typing import Any

from temporalio import activity
from temporalio.testing import WorkflowEnvironment
from temporalio.worker import Worker

from clip_factory.entrypoints.contracts.generated.youtube_publishing import (
    OAuthConnectionWorkflowInputV1,
    OAuthConnectionWorkflowResultV1,
)
from clip_factory.entrypoints.temporal.youtube_publishing.oauth_workflow import (
    YouTubeOAuthWorkflow,
)


def make_oauth_workflow_input() -> dict[str, Any]:
    return OAuthConnectionWorkflowInputV1(
        contractVersion=1,
        connectionId="018f4f2c-93d7-7c75-8f0f-7f5165e8bb42",
        requestedScopes=(
            "https://www.googleapis.com/auth/youtube.upload",
            "https://www.googleapis.com/auth/youtube.readonly",
        ),
    ).model_dump(mode="json")


OAuthWorkflowResultPayload = dict[str, Any]


def make_connected_result() -> OAuthWorkflowResultPayload:
    return OAuthConnectionWorkflowResultV1(
        contractVersion=1,
        connectionId="018f4f2c-93d7-7c75-8f0f-7f5165e8bb42",
        status="CONNECTED",
        safeReasonCode=None,
    ).model_dump(mode="json")


class CapturingAuthorizationActivity:
    def __init__(self, result: OAuthWorkflowResultPayload) -> None:
        self.inputs: list[dict[str, Any]] = []
        self._result = result

    @activity.defn(name="authorize_or_resume_oauth_activity")
    async def run(
        self,
        payload: dict[str, Any],
    ) -> OAuthWorkflowResultPayload:
        OAuthConnectionWorkflowInputV1.model_validate(payload)
        self.inputs.append(payload)
        return self._result


class CapturingDeliveryActivity:
    def __init__(self) -> None:
        self.results: list[OAuthWorkflowResultPayload] = []

    @activity.defn(name="deliver_oauth_result_activity")
    async def run(self, result: OAuthWorkflowResultPayload) -> None:
        self.results.append(result)


def test_oauth_workflow_separates_authorization_from_result_delivery() -> None:
    asyncio.run(_run_oauth_workflow_separates_authorization_from_result_delivery())


async def _run_oauth_workflow_separates_authorization_from_result_delivery() -> None:
    async with await WorkflowEnvironment.start_time_skipping() as env:
        authorization = CapturingAuthorizationActivity(make_connected_result())
        delivery = CapturingDeliveryActivity()
        async with Worker(
            env.client,
            task_queue="test-youtube-oauth",
            workflows=[YouTubeOAuthWorkflow],
            activities=[authorization.run, delivery.run],
        ):
            result = await env.client.execute_workflow(
                YouTubeOAuthWorkflow.run,
                make_oauth_workflow_input(),
                id="youtube-oauth-connection-1",
                task_queue="test-youtube-oauth",
                execution_timeout=timedelta(minutes=12),
            )

    parsed = OAuthConnectionWorkflowResultV1.model_validate(result)
    assert parsed.status.value == "CONNECTED"
    assert authorization.inputs[0].keys() == {
        "contractVersion",
        "connectionId",
        "requestedScopes",
    }
    assert delivery.results == [result]
