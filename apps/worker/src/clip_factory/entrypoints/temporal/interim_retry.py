from datetime import timedelta
from typing import Any, Callable

from temporalio import workflow
from temporalio.common import RetryPolicy


async def execute_activity_once(
    activity: Callable[..., Any],
    arg: Any,
    *,
    start_to_close_timeout: timedelta,
    heartbeat_timeout: timedelta | None = None,
) -> Any:
    return await workflow.execute_activity(
        activity,
        arg,
        start_to_close_timeout=start_to_close_timeout,
        heartbeat_timeout=heartbeat_timeout,
        retry_policy=RetryPolicy(maximum_attempts=1),
    )
