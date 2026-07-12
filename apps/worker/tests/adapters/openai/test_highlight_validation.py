import asyncio

import pytest

from clip_factory.adapters.openai.client_models import ClientResponse, ClientUsage
from clip_factory.adapters.openai.highlight_adapter import OpenAIHighlightAdapter
from clip_factory.ports.model_access import ModelAccessStatus
from clip_factory.ports.highlight_model import HighlightRequest


class Responses:
    async def create(self, **_kwargs):
        class Response:
            output_text = '{"candidates":[{"startMs":1}]}'
            id = "r"
            usage = None

        return Response()


class Client:
    responses = Responses()


def test_adapter_rejects_malformed_structured_candidate():
    with pytest.raises((KeyError, ValueError)):
        asyncio.run(
            OpenAIHighlightAdapter(Client()).extract(
                HighlightRequest("x", "gpt-5.5", "low")
            )
        )


def test_adapter_delegates_model_access_check():
    class Models:
        async def retrieve(self, _model_id):
            return object()

    class ModelClient:
        models = Models()

    result = asyncio.run(OpenAIHighlightAdapter(ModelClient()).check("gpt-5.5"))

    assert result.status is ModelAccessStatus.AVAILABLE


def test_adapter_rejects_unapproved_model_before_request():
    with pytest.raises(ValueError, match="approved catalog"):
        asyncio.run(
            OpenAIHighlightAdapter(Client()).extract(
                HighlightRequest("x", "gpt-nope", "low")
            )
        )


def test_adapter_rejects_nonlist_candidates():
    class BadResponses:
        async def create(self, **_kwargs):
            class Response:
                output_text = '{"candidates":{}}'
                id = "r"
                usage = None

            return Response()

    class BadClient:
        responses = BadResponses()

    with pytest.raises(ValueError, match="malformed highlight candidates"):
        asyncio.run(
            OpenAIHighlightAdapter(BadClient()).extract(
                HighlightRequest("x", "gpt-5.5", "low")
            )
        )


def test_adapter_rejects_nondict_candidate():
    class BadResponses:
        async def create(self, **_kwargs):
            class Response:
                output_text = '{"candidates":[1]}'
                id = "r"
                usage = None

            return Response()

    class BadClient:
        responses = BadResponses()

    with pytest.raises(ValueError, match="malformed highlight candidate"):
        asyncio.run(
            OpenAIHighlightAdapter(BadClient()).extract(
                HighlightRequest("x", "gpt-5.5", "low")
            )
        )


def test_adapter_parses_valid_client_response_and_usage():
    class GoodResponses:
        calls: list[dict[str, object]]

        def __init__(self) -> None:
            self.calls = []

        async def create(self, **kwargs):
            self.calls.append(kwargs)
            return ClientResponse(
                "resp-1",
                {
                    "candidates": [
                        {
                            "startMs": 100,
                            "endMs": 1_000,
                            "title": "Hook",
                            "rationale": "strong opening",
                            "overallScore": 900_000,
                            "rank": 1,
                            "scores": {
                                "hook": 900_000,
                                "coherence": 800_000,
                                "payoff": 700_000,
                                "novelty": 600_000,
                                "energy": 500_000,
                                "instructionFit": 400_000,
                                "boundaryQuality": 300_000,
                            },
                        }
                    ]
                },
                ClientUsage(input_tokens=1, output_tokens=2, reasoning_tokens=3),
            )

    class GoodClient:
        def __init__(self) -> None:
            self.responses = GoodResponses()

    client = GoodClient()

    response = asyncio.run(
        OpenAIHighlightAdapter(client).extract(
            HighlightRequest("transcript", "gpt-5.6-sol", "high", "find hooks")
        )
    )

    assert response.response_id == "resp-1"
    assert response.candidates[0].title == "Hook"
    assert response.usage == {
        "input_tokens": 1,
        "output_tokens": 2,
        "reasoning_tokens": 3,
    }
    assert client.responses.calls[0]["prompt_cache_options"] == {"mode": "explicit"}
