import hashlib
import json
from dataclasses import dataclass
from typing import Protocol

from clip_factory.ports.highlight_model import (
    HighlightModelPort,
    HighlightRequest,
    HighlightResponse,
)
from clip_factory.domain.highlight import HighlightCandidate, HighlightScores
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

    @property
    def request_hash(self) -> str:
        payload = {
            "model": self.request.model,
            "reasoning": self.request.reasoning,
            "instruction": self.request.instruction,
            "text": self.request.text,
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

    async def record_paid_call(self, value: dict[str, object]) -> None: ...


async def reconcile_paid_call(
    deps: PaidCallDependencies, call: PaidCallInput
) -> HighlightResponse | None:
    """Read the durable callback/artifact before permitting a fresh request."""
    reconcile = getattr(deps, "reconcile", None)
    if reconcile is not None:
        result = await reconcile(call.call_id, call.request_hash)
        restored = _restore_response(result)
        if restored is not None:
            return restored
    key = f"projects/{call.project_id}/analysis/{call.analysis_run_id}/calls/{call.call_id}.json"
    head = getattr(deps, "head_json", None)
    get = getattr(deps, "get_json", None)
    if head is not None and get is not None and await head(key):
        return _restore_response(await get(key))
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
                    int(item["startMs"]), int(item["endMs"]), str(item["title"]),
                    str(item["rationale"]), int(item["overallScore"]),
                    HighlightScores(0, 0, 0, 0, 0, 0, 0), int(item.get("rank", 0)),
                )
            )
        except (KeyError, TypeError, ValueError):
            return None
    return HighlightResponse(tuple(candidates), str(value.get("providerResponseId", "")), value.get("normalizedUsage", {}))


async def retry_uncertain_paid_call(
    model: HighlightModelPort,
    deps: PaidCallDependencies,
    call: PaidCallInput,
    acknowledge_possible_prior_spend: bool,
) -> HighlightResponse:
    if not acknowledge_possible_prior_spend:
        raise PaidCallUncertainError("explicit acknowledgement is required")
    return await call_openai_once(model, deps, call)


async def call_openai_once(
    model: HighlightModelPort, deps: PaidCallDependencies, call: PaidCallInput
) -> HighlightResponse:
    """One provider attempt; never retry an outcome that occurred after SENT."""
    reservation = CostReservationRequest(
        call.project_id,
        call.analysis_run_id,
        call.call_id,
        call.request_hash,
        call.worst_case_microusd,
        call.call_id,
    )
    try:
        await deps.reserve(reservation)
    except Exception as exc:
        raise PreSendFailureError("reservation failed before provider request") from exc
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
                    }
                    for c in response.candidates
                ]
            },
        }
    key = f"projects/{call.project_id}/analysis/{call.analysis_run_id}/calls/{call.call_id}.json"
    await deps.put_json(key, artifact)
    callback = getattr(deps, "record_paid_call", None)
    if callback is not None:
        await callback({**artifact, "artifactKey": key})
    return response
