import hashlib
import json
from uuid import uuid4
from dataclasses import dataclass
from typing import Protocol

from clip_factory.ports.highlight_model import (
    HighlightModelPort,
    HighlightRequest,
    HighlightResponse,
)
from clip_factory.domain.highlight import HighlightCandidate, HighlightScores
from clip_factory.application.analyze_highlights import rank_candidates
from clip_factory.domain.highlight import TimeRange
from clip_factory.ports.cost_reservation import CostReservationRequest

OPENAI_PRE_SEND_FAILURE = "OPENAI_PRE_SEND_FAILURE"
OPENAI_OUTCOME_UNCERTAIN = "OPENAI_OUTCOME_UNCERTAIN"


@dataclass(frozen=True)
class PaidCallInput:
    project_id: str
    analysis_run_id: str
    request: HighlightRequest
    call_id: str
    worst_case_microusd: int
    reservation_prepared: bool = False

    @property
    def request_hash(self) -> str:
        payload = {
            "callId": self.call_id,
            "projectId": self.project_id,
            "analysisRunId": self.analysis_run_id,
            "model": self.request.model,
            "reasoning": self.request.reasoning,
            "instruction": self.request.instruction,
            "text": self.request.text,
            "maximumClips": self.request.maximum_clips,
            "maximumDurationMs": self.request.maximum_duration_ms,
            "window": _window_payload(self.request.window),
            "worstCaseMicrousd": self.worst_case_microusd,
        }
        return hashlib.sha256(
            json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
        ).hexdigest()


class PaidCallUncertainError(RuntimeError):
    error_type = OPENAI_OUTCOME_UNCERTAIN


class PreSendFailureError(RuntimeError):
    error_type = OPENAI_PRE_SEND_FAILURE


class PaidCallDependencies(Protocol):
    async def reserve(self, request: CostReservationRequest) -> object: ...
    async def mark_sent(self, call_id: str, request_hash: str) -> None: ...
    async def put_json(self, key: str, value: dict[str, object]) -> object: ...
    async def reconcile(self, call_id: str, request_hash: str) -> object | None: ...
    async def head_json(self, key: str) -> bool: ...
    async def get_json(self, key: str) -> object: ...
    async def record_paid_call(self, value: dict[str, object]) -> None: ...


async def reconcile_paid_call(
    deps: PaidCallDependencies, call: PaidCallInput
) -> HighlightResponse | None:
    """Read the durable callback/artifact before permitting a fresh request."""
    result = await deps.reconcile(call.call_id, call.request_hash)
    restored = _restore_response(result)
    if restored is not None:
        return restored
    key = f"projects/{call.project_id}/analysis/{call.analysis_run_id}/calls/{call.call_id}.json"
    if await deps.head_json(key):
        return _restore_response(await deps.get_json(key))
    return None


def _restore_response(value: object) -> HighlightResponse | None:
    if isinstance(value, HighlightResponse):
        return value
    if not isinstance(value, dict):
        return None
    payload = value.get("validatedResponse", value)
    if not isinstance(payload, dict) or not isinstance(payload.get("candidates"), list):
        return None
    candidates = []
    for item in payload["candidates"]:
        if not isinstance(item, dict):
            return None
        try:
            candidates.append(
                HighlightCandidate(
                    int(item["startMs"]),
                    int(item["endMs"]),
                    str(item["title"]),
                    str(item["rationale"]),
                    int(item["overallScore"]),
                    HighlightScores(
                        int(item["hook"]), int(item["coherence"]), int(item["payoff"]),
                        int(item["novelty"]), int(item["energy"]),
                        int(item["instructionFit"]), int(item["boundaryQuality"]),
                    ),
                    int(item.get("rank", 0)),
                )
            )
        except (KeyError, TypeError, ValueError):
            return None
    return HighlightResponse(
        tuple(candidates),
        str(value.get("providerResponseId", "")),
        value.get("normalizedUsage", {}),
    )


async def retry_uncertain_paid_call(
    model: HighlightModelPort,
    deps: PaidCallDependencies,
    call: PaidCallInput,
    acknowledge_possible_prior_spend: bool,
) -> HighlightResponse:
    if not acknowledge_possible_prior_spend:
        raise PaidCallUncertainError("explicit acknowledgement is required")
    fresh = PaidCallInput(
        call.project_id,
        call.analysis_run_id,
        call.request,
        str(uuid4()),
        call.worst_case_microusd,
    )
    await reserve_paid_call(deps, fresh)
    return await call_openai_once(model, deps, fresh, reserved=True)


async def reserve_paid_call(deps: PaidCallDependencies, call: PaidCallInput) -> None:
    await deps.reserve(
        CostReservationRequest(
            call.project_id,
            call.analysis_run_id,
            call.call_id,
            call.request_hash,
            call.worst_case_microusd,
            call.call_id,
        )
    )


async def call_openai_once(
    model: HighlightModelPort,
    deps: PaidCallDependencies,
    call: PaidCallInput,
    *,
    reserved: bool = False,
) -> HighlightResponse:
    """One provider attempt; never retry an outcome that occurred after SENT."""
    access_check = getattr(model, "check", None)
    if access_check is not None:
        access = await access_check(call.request.model)
        if getattr(getattr(access, "status", None), "value", None) != "AVAILABLE":
            raise PreSendFailureError("model is not available for this key")
    if not reserved:
        try:
            await reserve_paid_call(deps, call)
        except Exception as exc:
            raise PreSendFailureError(
                "reservation failed before provider request"
            ) from exc
    try:
        await deps.mark_sent(call.call_id, call.request_hash)
    except Exception as exc:
        raise PreSendFailureError("reservation could not be marked SENT") from exc
    try:
        response = await model.extract(call.request)
    except (TimeoutError, EOFError, ConnectionError) as exc:
        raise PaidCallUncertainError("provider outcome is uncertain") from exc
    except Exception as exc:
        raise PaidCallUncertainError("provider outcome is uncertain") from exc
    window = _as_time_range(call.request.window)
    try:
        if window is None and response.candidates:
            raise ValueError("highlight request window is required")
        candidates = (
            rank_candidates(response.candidates, window, call.request.maximum_clips, call.request.maximum_duration_ms)
            if isinstance(window, TimeRange)
            else ()
        )
    except (TypeError, ValueError) as exc:
        key = f"projects/{call.project_id}/analysis/{call.analysis_run_id}/calls/{call.call_id}.json"
        await deps.put_json(
            key,
            {
                "callId": call.call_id,
                "requestHash": call.request_hash,
                "providerResponseId": response.response_id or "",
                "normalizedUsage": response.usage or {},
                "validationError": str(exc),
            },
        )
        await deps.record_paid_call(
            {
                "callId": call.call_id,
                "requestHash": call.request_hash,
                "providerResponseId": response.response_id or "",
                "normalizedUsage": response.usage or {},
                "artifactKey": key,
                "validationError": str(exc),
            }
        )
        raise
    response = HighlightResponse(candidates, response.response_id, response.usage)
    artifact: dict[str, object] = {
        "callId": call.call_id,
        "requestHash": call.request_hash,
        "providerResponseId": response.response_id or "",
        "normalizedUsage": response.usage or {},
        "validatedResponse": {
            "candidates": [
                {
                    "startMs": c.start_ms,
                    "endMs": c.end_ms,
                    "title": c.title,
                    "rationale": c.rationale,
                    "rank": c.rank,
                    "overallScore": c.overall_score,
                    "hook": c.scores.hook,
                    "coherence": c.scores.coherence,
                    "payoff": c.scores.payoff,
                    "novelty": c.scores.novelty,
                    "energy": c.scores.energy,
                    "instructionFit": c.scores.instruction_fit,
                    "boundaryQuality": c.scores.boundary_quality,
                }
                for c in response.candidates
            ]
        },
    }
    key = f"projects/{call.project_id}/analysis/{call.analysis_run_id}/calls/{call.call_id}.json"
    await deps.put_json(key, artifact)
    await deps.record_paid_call({**artifact, "artifactKey": key})
    return response


def _window_payload(window: object | None) -> object:
    if isinstance(window, TimeRange):
        return {"startMs": window.start_ms, "endMs": window.end_ms}
    return window


def _as_time_range(window: object | None) -> TimeRange | None:
    if isinstance(window, TimeRange):
        return window
    if isinstance(window, (tuple, list)) and len(window) == 2:
        return TimeRange(int(window[0]), int(window[1]))
    return None
