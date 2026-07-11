from typing import Any, Awaitable, Callable
from temporalio import activity
from temporalio.exceptions import ApplicationError

from clip_factory.ports.highlight_model import HighlightRequest
from clip_factory.ports.paid_call import PaidCallInput, call_openai_once

_paid_model: Any = None
_paid_dependencies: Any = None


def configure_paid_highlight_call(model: Any, dependencies: Any) -> None:
    global _paid_model, _paid_dependencies
    _paid_model, _paid_dependencies = model, dependencies


def build_highlight_activity(
    model: Any,
) -> Callable[[HighlightRequest], Awaitable[Any]]:
    async def analyze(request: HighlightRequest) -> Any:
        return await model.extract(request)

    return analyze


@activity.defn
async def call_openai_once_activity(input: PaidCallInput) -> Any:
    if _paid_model is None or _paid_dependencies is None:
        raise RuntimeError("paid highlight activity is not configured")
    try:
        return await call_openai_once(_paid_model, _paid_dependencies, input)
    except Exception as exc:
        error_type = getattr(exc, "error_type", "OPENAI_OUTCOME_UNCERTAIN")
        raise ApplicationError(str(exc), type=error_type, non_retryable=True) from exc


@activity.defn
async def reconcile_paid_call_activity(input: PaidCallInput) -> Any:
    if _paid_dependencies is None:
        raise RuntimeError("paid highlight activity is not configured")
    from clip_factory.ports.paid_call import reconcile_paid_call

    return await reconcile_paid_call(_paid_dependencies, input)
