from typing import Any, Awaitable, Callable
from temporalio import activity
from temporalio.exceptions import ApplicationError
from clip_factory.application.check_model_access import CheckModelAccess

from clip_factory.ports.highlight_model import HighlightRequest
from clip_factory.ports.highlight_model import HighlightResponse
from clip_factory.ports.model_access import ModelAccessStatus
from clip_factory.ports.model_access import ModelAccessResult
from clip_factory.ports.paid_call import (
    PaidCallDependencies,
    PaidCallInput,
    call_openai_once,
    reconcile_paid_call,
    reserve_paid_call,
)


class _UnconfiguredPaidCallDependencies:
    async def reserve(self, _request: Any) -> object:
        raise RuntimeError("paid highlight dependencies are not configured")

    async def mark_sent(self, _call_id: str, _request_hash: str) -> None:
        raise RuntimeError("paid highlight dependencies are not configured")

    async def put_json(self, _key: str, _value: dict[str, object]) -> object:
        raise RuntimeError("paid highlight dependencies are not configured")

    async def reconcile(self, _call_id: str, _request_hash: str) -> object | None:
        raise RuntimeError("paid highlight dependencies are not configured")

    async def head_json(self, _key: str) -> bool:
        raise RuntimeError("paid highlight dependencies are not configured")

    async def get_json(self, _key: str) -> object:
        raise RuntimeError("paid highlight dependencies are not configured")

    async def record_paid_call(self, _value: dict[str, object]) -> None:
        raise RuntimeError("paid highlight dependencies are not configured")


_paid_model: Any = _UnconfiguredPaidCallDependencies()
_paid_dependencies: PaidCallDependencies = _UnconfiguredPaidCallDependencies()
_model_access: CheckModelAccess | None = None


def configure_paid_highlight_call(
    model: Any,
    dependencies: PaidCallDependencies,
    model_access: CheckModelAccess | None = None,
) -> None:
    global _paid_model, _paid_dependencies, _model_access
    if model_access is None:

        class _LegacyAccess:
            async def check(self, model_id: str) -> ModelAccessResult:
                check = getattr(model, "check", None)
                return (
                    await check(model_id)
                    if check
                    else ModelAccessResult(model_id, ModelAccessStatus.AVAILABLE)
                )

        model_access = CheckModelAccess(_LegacyAccess())
    _paid_model, _paid_dependencies, _model_access = model, dependencies, model_access


def build_highlight_activity(
    model: Any,
) -> Callable[[HighlightRequest], Awaitable[Any]]:
    async def analyze(request: HighlightRequest) -> Any:
        return await model.extract(request)

    return analyze


@activity.defn
async def call_openai_once_activity(input: PaidCallInput) -> HighlightResponse:
    try:
        if _model_access is None:
            raise RuntimeError("model access gate is not configured")
        access = await _model_access.execute(input.request.model)
        if access.status is not ModelAccessStatus.AVAILABLE:
            raise ApplicationError(
                access.presentation or "model is not available",
                type="OPENAI_PRE_SEND_FAILURE",
                non_retryable=True,
            )
        return await call_openai_once(
            _paid_model, _paid_dependencies, input, reserved=input.reservation_prepared
        )
    except Exception as exc:
        error_type = getattr(exc, "error_type", "OPENAI_OUTCOME_UNCERTAIN")
        raise ApplicationError(str(exc), type=error_type, non_retryable=True) from exc


@activity.defn
async def reserve_paid_call_activity(input: PaidCallInput) -> None:
    await reserve_paid_call(_paid_dependencies, input)


@activity.defn
async def reconcile_paid_call_activity(
    input: PaidCallInput,
) -> HighlightResponse | None:
    return await reconcile_paid_call(_paid_dependencies, input)
