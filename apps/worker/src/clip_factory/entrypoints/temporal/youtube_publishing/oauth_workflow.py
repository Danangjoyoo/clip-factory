from datetime import timedelta
from typing import Any

from temporalio import workflow
from temporalio.common import RetryPolicy

with workflow.unsafe.imports_passed_through():
    from clip_factory.entrypoints.contracts.generated.youtube_publishing import (
        OAuthConnectionWorkflowInputV1,
    )
    from clip_factory.entrypoints.temporal.youtube_publishing.oauth_activities import (
        authorize_or_resume_oauth_activity,
        deliver_oauth_result_activity,
    )


@workflow.defn
class YouTubeOAuthWorkflow:
    @workflow.run
    async def run(
        self,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        workflow_input = OAuthConnectionWorkflowInputV1.model_validate(payload)
        authorization: dict[str, Any] = await workflow.execute_activity(
            authorize_or_resume_oauth_activity,
            workflow_input.model_dump(mode="json"),
            start_to_close_timeout=timedelta(minutes=11),
            heartbeat_timeout=timedelta(seconds=15),
            retry_policy=RetryPolicy(maximum_attempts=3),
        )
        await workflow.execute_activity(
            deliver_oauth_result_activity,
            authorization,
            start_to_close_timeout=timedelta(seconds=30),
            retry_policy=RetryPolicy(maximum_attempts=3),
        )
        return authorization
