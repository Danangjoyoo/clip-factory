import json
from pathlib import Path
from typing import Any, cast

from clip_factory.domain.highlight import HighlightCandidate, HighlightScores
from clip_factory.ports.highlight_model import HighlightRequest, HighlightResponse
from clip_factory.adapters.openai.client_models import ClientResponse
from clip_factory.adapters.openai.model_access_adapter import MODEL_CATALOG
from clip_factory.adapters.openai.model_access_adapter import OpenAIModelAccessAdapter

PROMPT = (Path(__file__).parent / "prompts" / "highlights-v1.txt").read_text()


class OpenAIHighlightAdapter:
    def __init__(self, client: Any, max_generated_tokens: int | Any = 4096) -> None:
        self._client = client
        self._max_generated_tokens = (
            max_generated_tokens
            if isinstance(max_generated_tokens, int)
            else int(
                getattr(
                    max_generated_tokens,
                    "maxGeneratedTokens",
                    getattr(max_generated_tokens, "max_generated_tokens", 4096),
                )
            )
        )

    async def check(self, model_id: str) -> Any:
        return await OpenAIModelAccessAdapter(self._client).check(model_id)

    async def extract(self, request: HighlightRequest) -> HighlightResponse:
        profile = MODEL_CATALOG.get(request.model)
        if profile is None or request.reasoning not in profile:
            raise ValueError("model or reasoning is not in the approved catalog")
        max_generated_tokens = profile[request.reasoning]
        payload: dict[str, Any] = {
            "model": request.model,
            "store": False,
            "reasoning": {"effort": request.reasoning},
            "instructions": PROMPT,
            "input": f"{request.instruction}\n\nTranscript:\n{request.text}".strip(),
            "max_output_tokens": max_generated_tokens,
            "text": {
                "format": {
                    "type": "json_schema",
                    "name": "highlight-response",
                    "strict": True,
                    "schema": _schema(),
                }
            },
        }
        if request.model == "gpt-5.6-sol":
            payload["prompt_cache_options"] = {"mode": "explicit"}
        response = await self._client.responses.create(**payload)
        if isinstance(response, ClientResponse):
            parsed = response.output
            response_id = response.response_id
            usage_value: Any = response.usage
        else:
            parsed = _response_json(response)
            response_id = getattr(response, "id", "")
            usage_value = getattr(response, "usage", None)
        raw_candidates = parsed.get("candidates", [])
        if not isinstance(raw_candidates, list):
            raise ValueError("malformed highlight candidates")
        candidates = tuple(_candidate(item) for item in raw_candidates if isinstance(item, dict))
        if len(candidates) != len(raw_candidates):
            raise ValueError("malformed highlight candidate")
        return HighlightResponse(candidates, response_id, _usage(usage_value))


def _response_json(response: Any) -> dict[str, Any]:
    value = getattr(response, "output_text", None)
    if value is None:
        value = getattr(response, "output", "{}")
    if isinstance(value, str):
        parsed = json.loads(value)
        return cast(dict[str, Any], parsed) if isinstance(parsed, dict) else {}
    if isinstance(value, dict):
        return dict(value)
    return {}


def _candidate(value: dict[str, Any]) -> HighlightCandidate:
    scores = value["scores"]
    if not isinstance(scores, dict):
        raise ValueError("malformed highlight scores")
    return HighlightCandidate(
        int(value["startMs"]),
        int(value["endMs"]),
        str(value["title"]),
        str(value["rationale"]),
        int(value["overallScore"]),
        HighlightScores(
            *(
                int(scores[key])
                for key in (
                    "hook",
                    "coherence",
                    "payoff",
                    "novelty",
                    "energy",
                    "instructionFit",
                    "boundaryQuality",
                )
            )
        ),
        int(value["rank"]),
    )


def _safe_candidate(value: dict[str, Any]) -> HighlightCandidate | None:
    try:
        return _candidate(value)
    except (KeyError, TypeError, ValueError):
        return None


def _usage(usage: Any) -> dict[str, int]:
    if usage is None:
        return {}
    return {
        "input_tokens": int(getattr(usage, "input_tokens", 0) or 0),
        "output_tokens": int(getattr(usage, "output_tokens", 0) or 0),
        "reasoning_tokens": int(getattr(usage, "reasoning_tokens", 0) or 0),
    }


def _schema() -> dict[str, Any]:
    score = {"type": "integer", "minimum": 0, "maximum": 1000000}
    return {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "candidates": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "startMs": {"type": "integer"},
                        "endMs": {"type": "integer"},
                        "title": {"type": "string"},
                        "rationale": {"type": "string"},
                        "rank": {"type": "integer"},
                        "overallScore": score,
                        "scores": {
                            "type": "object",
                            "additionalProperties": False,
                            "properties": {
                                key: score
                                for key in (
                                    "hook",
                                    "coherence",
                                    "payoff",
                                    "novelty",
                                    "energy",
                                    "instructionFit",
                                    "boundaryQuality",
                                )
                            },
                            "required": [
                                "hook",
                                "coherence",
                                "payoff",
                                "novelty",
                                "energy",
                                "instructionFit",
                                "boundaryQuality",
                            ],
                        },
                    },
                    "required": [
                        "startMs",
                        "endMs",
                        "title",
                        "rationale",
                        "rank",
                        "overallScore",
                        "scores",
                    ],
                },
            }
        },
        "required": ["candidates"],
    }
